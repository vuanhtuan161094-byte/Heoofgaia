"""Real Chrome file:// gameplay acceptance for the 2009 world visitables."""
from pathlib import Path
import json
import os
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(__file__).resolve().parent
GAME = ROOT / 'Play-Heoofgaia-HG11.html'
EVIDENCE = ROOT / 'docs' / 'evidence' / 'hg10'
REPORT = ROOT / 'docs' / 'qa' / 'hg10' / 'world-buildings-chrome.json'
EVIDENCE.mkdir(parents=True, exist_ok=True)
REPORT.parent.mkdir(parents=True, exist_ok=True)
chrome = Path(os.environ.get('PROGRAMFILES', 'C:/Program Files')) / 'Google' / 'Chrome' / 'Application' / 'chrome.exe'
if not chrome.is_file():
    raise SystemExit(f'Chrome executable not found: {chrome}')
checks, errors = [], []

def check(name, ok, detail=''):
    checks.append({'name': name, 'passed': bool(ok), 'detail': str(detail)})
    print(('PASS' if ok else 'FAIL'), name, detail)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=str(chrome), args=['--allow-file-access-from-files'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1080}, device_scale_factor=1)
    page = context.new_page()
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.goto(GAME.as_uri(), wait_until='load')
    check('Standalone HTML opens in Chrome from file://', page.title().startswith('Anh Hùng Thời Loạn'), page.title())
    page.locator('[data-action="start"]').click()
    check('New game opens the live world map at 100x100', '100 × 100' in page.locator('#main').inner_text() and page.evaluate('HOG_ENGINE.WIDTH===100&&HOG_ENGINE.HEIGHT===100'))
    check('Source-backed world structures appear in the interactive map ledger', page.locator('.landmarks [data-action="select"][data-key="26,4"]').count() == 1 and page.locator('.landmarks [data-action="select"][data-key="27,88"]').count() == 1)

    page.locator('.landmarks [data-action="select"][data-key="26,4"]').click()
    check('War Academy is selected at its 2009 guide coordinate', page.locator('.target-information h2').inner_text() == 'Học viện Chiến tranh · (26,4)' and page.evaluate('HOG_PAINTER.mapCamera().centerX===26&&HOG_PAINTER.mapCamera().centerY===4'))
    page.locator('[data-action="visit"]').click()
    academy = page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return {visit:s.worldVisits["26,4"],buff:s.heroBuffs[0],stats:HOG_ENGINE.heroStats(s),valid:HOG_ENGINE.strictSave(s)}})()')
    check('Visiting applies a real 10% attack buff to the active hero', academy['buff']['stat'] == 'atk' and abs(academy['stats']['atk'] - 13.2) < 1e-8 and academy['valid'], json.dumps(academy, ensure_ascii=False))
    check('Visited daily building is disabled against a second reward', page.locator('[data-action="visit"]').is_disabled())
    page.locator('#save').click()
    page.reload(wait_until='load')
    reload = page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return {version:s.version,visited:s.worldVisits["26,4"],buff:s.heroBuffs[0],valid:HOG_ENGINE.strictSave(s)}})()')
    check('Buff and daily visit survive actual file:// browser reload in v07', reload['version'] == 7 and reload['visited'] == academy['visit'] and reload['buff']['stat'] == 'atk' and reload['valid'], json.dumps(reload, ensure_ascii=False))

    page.locator('.landmarks [data-action="select"][data-key="27,88"]').click()
    before = page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return {gold:s.res.gold,ap:s.ap,army:JSON.stringify(s.army)}})()')
    page.locator('[data-action="visit"]').click()
    after = page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return {gold:s.res.gold,ap:s.ap,army:JSON.stringify(s.army),reward:s.log[0],valid:HOG_ENGINE.strictSave(s)}})()')
    check('Watermill visit grants 2,000 real gold without spending AP or troops', abs(after['gold'] - before['gold'] - 2000) < 1e-6 and after['ap'] == before['ap'] and after['army'] == before['army'] and after['valid'] and '+2.000 Vàng' in after['reward'], json.dumps(after, ensure_ascii=False))
    check('Both real world-visit effects remain live in gameplay state', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.worldVisits["26,4"]&&s.worldVisits["27,88"]&&s.heroBuffs.some(b=>b.stat==="atk"&&b.remaining>0)})()'))
    page.wait_for_timeout(3200)
    page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=str(EVIDENCE / 'world-buildings-chrome.png'), full_page=True)
    check('No JavaScript page errors during visit, reward, save and reload', not errors, '; '.join(errors))
    context.close()
    browser.close()

passed = sum(c['passed'] for c in checks)
result = {'suite': 'HG-10 world buildings', 'source': 'file:// Play-Heoofgaia-HG11.html in installed Chrome', 'total': len(checks), 'passed': passed, 'failed': len(checks)-passed, 'errors': errors, 'checks': checks}
REPORT.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'BROWSER TOTAL {passed}/{len(checks)} PASS; JS exceptions={len(errors)}')
raise SystemExit(0 if passed == len(checks) else 1)
