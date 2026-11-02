"""Focused real-Chrome check for saved regional spell profile and battle casting."""
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
    check('Offline game opens with the requested title', page.title() == 'Anh Hùng Thời Loạn')
    page.locator('[data-action="spelledition"][data-edition="china2009"]').click()
    page.locator('[data-action="race"][data-race="orc"]').click()
    page.screenshot(path=str(evidence / 'spell-edition-selector-chrome.png'), full_page=True)
    page.locator('[data-action="start"]').click()
    check('New kingdom persists the chosen China 2009 spell edition', page.evaluate('HOG_APP_DEBUG.getState().spellEdition==="china2009"&&HOG_APP_DEBUG.getState().race==="orc"'))
    page.locator('#nav [data-tab="magic"]').click()
    check('Orc catalog shows source-dated Sina Harden Bones at two percent', 'Cường hóa xương cốt' in page.locator('#main').inner_text() and '2%/cấp' in page.locator('#main').inner_text())
    page.locator('[data-action="herolearn"][data-id="harden_bones"]').click()
    page.locator('[data-action="heroequip"][data-id="harden_bones"]').click()
    started = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),t=HOG_ENGINE.TILES.find(q=>q.kind==='npc');HOG_ENGINE.startMarch(s,t.key);HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render();return {target:t.key,battle:!!s.battle,profile:s.spellEdition}})()''')
    check('Source-selected spell enters a naturally generated NPC battle', started['battle'] and started['profile'] == 'china2009')
    before = page.evaluate('HOG_APP_DEBUG.getState().battle.allies[0].def')
    page.locator('[data-action="cast"][data-id="harden_bones"]').click()
    applied = page.evaluate('''(()=>{const b=HOG_APP_DEBUG.getState().battle;return {def:b.allies[0].def,spell:b.activeSpell?.id}})()''')
    check('Casting Harden Bones changes actual allied stack defense by two percent', applied['spell'] == 'harden_bones' and abs(applied['def']-before*1.02)<1e-8)
    page.screenshot(path=str(evidence / 'china-2009-orc-harden-bones-combat-chrome.png'), full_page=True)
    page.locator('#save').click()
    page.reload(wait_until='load')
    check('v07 Save/Reload preserves profile, equipped skill, battle and buff', page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),b=s?.battle;return s?.version===7&&s.spellEdition==='china2009'&&s.heroMagic.harden_bones===1&&s.heroes[0].equippedSpells.includes('harden_bones')&&b?.activeSpell?.id==='harden_bones'&&b.allies[0].def>0})()'''))
    check('No JavaScript page errors during offline regional spell flow', not errors)
    context.close()
    browser.close()

result = {'command': '.venv\\Scripts\\python.exe qa-spell-edition-chrome.py', 'browser': browser_path, 'total': len(checks), 'passed': sum(c['passed'] for c in checks), 'failed': sum(not c['passed'] for c in checks), 'errors': errors, 'checks': checks}
receipt = receipts / 'china-2009-spell-profile-chrome.json'
for name in ['spell-edition-selector-chrome.png', 'china-2009-orc-harden-bones-combat-chrome.png']:
    asset = evidence / name
    result.setdefault('artifacts', {})[name] = {'sha256': hashlib.sha256(asset.read_bytes()).hexdigest().upper(), 'bytes': asset.stat().st_size}
receipt.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'CHROME TOTAL {result["passed"]}/{result["total"]} PASS; JS errors={len(errors)}')
raise SystemExit(0 if result['passed'] == result['total'] else 1)
