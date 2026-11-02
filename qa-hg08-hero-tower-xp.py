import hashlib
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parent
HTML = ROOT / 'Play-Heoofgaia-HG11.html'
EVIDENCE = ROOT / 'docs' / 'evidence' / 'hg08'
QA = ROOT / 'docs' / 'qa' / 'hg08'
EVIDENCE.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
checks, errors = [], []


def check(name, passed, detail=''):
    checks.append({'name': name, 'passed': bool(passed), 'detail': detail})
    print(('PASS' if passed else 'FAIL'), name, detail)


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        args=['--no-sandbox', '--disable-dev-shm-usage'],
    )
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(HTML.as_uri(), wait_until='load')
    check('Standalone opens with the requested game title',
          page.title().startswith('Anh Hùng Thời Loạn'), page.title())
    page.locator('[data-action="start"]').click()
    page.locator('#nav [data-tab="heroes"]').click()
    page.evaluate('''(()=>{
      const s=HOG_APP_DEBUG.getState();
      // Seed only the dated building level; the XP comes from live recruitment and queue completion.
      s.buildings.hall=10;s.buildings.heroTower=10;
      s.heroes[0].xp=0;
      HOG_APP_DEBUG.render();
    })()''')
    page.locator('[data-action="castellan"][data-id="1"]').click()
    appointed = page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.castellan===1})()')
    check('Actual hero screen appoints the Castellan before training', appointed)
    page.locator('#nav [data-tab="army"]').click()
    page.locator('#q_human_1').fill('3')
    page.locator('[data-action="recruit"][data-id="human_1"]').click()
    queued = page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return {count:s.training[0]?.count,unit:s.training[0]?.unitId,valid:HOG_ENGINE.strictSave(s)}})()')
    check('Recruit button creates a real saved training queue',
          queued == {'count': 3, 'unit': 'human_1', 'valid': True}, json.dumps(queued, ensure_ascii=False))
    page.evaluate('''(()=>{
      const s=HOG_APP_DEBUG.getState();
      const end=s.lastTick+s.training[0].remaining/s.speed*1000+1000;
      HOG_ENGINE.tick(s,end);
      HOG_APP_DEBUG.render();
    })()''')
    completed = page.evaluate('''(()=>{
      const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.id===1);
      return {army:s.army.human_1,queue:s.training.length,xp:h.xp,bonus:HOG_ENGINE.heroTowerExperienceBonus(s),valid:HOG_ENGINE.strictSave(s)}
    })()''')
    check('Completing training applies the 10% Hero Tower bonus to Castellan XP',
          completed == {'army': 19, 'queue': 0, 'xp': 137.5, 'bonus': 10, 'valid': True},
          json.dumps(completed, ensure_ascii=False))
    page.locator('#nav [data-tab="heroes"]').click()
    screen_text = page.locator('#main').inner_text()
    check('Heroes screen explains the active sourced Hero Tower XP bonus',
          'Hero Tower cấp 10 tăng 10% EXP cho tướng' in screen_text,
          screen_text[:420].replace('\n', ' | '))
    screenshot = EVIDENCE / 'hero-tower-xp-chrome.png'
    page.screenshot(path=str(screenshot), full_page=True)
    page.locator('#save').click()
    page.reload(wait_until='load')
    page.locator('#nav [data-tab="heroes"]').click()
    restored = page.evaluate('''(()=>{
      const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.id===1);
      return {version:s.version,tower:s.buildings.heroTower,xp:h.xp,valid:HOG_ENGINE.strictSave(s)}
    })()''')
    check('v07 Save/Reload retains fractional Hero Tower XP without schema change',
          restored == {'version': 7, 'tower': 10, 'xp': 137.5, 'valid': True},
          json.dumps(restored, ensure_ascii=False))
    check('No JavaScript exceptions during the live training flow', not errors, '; '.join(errors))
    browser.close()

passed = sum(item['passed'] for item in checks)
receipt = {
    'suite': 'HG-08 Hero Tower experience bonus',
    'source': 'installed Google Chrome, actual standalone HTML via file://; real Castellan appointment, troop recruitment, training completion, Save/Reload; fixture seeds Town Hall/Hero Tower 10',
    'total': len(checks), 'passed': passed, 'failed': len(checks) - passed,
    'errors': errors, 'checks': checks,
    'screenshot': str(screenshot.relative_to(ROOT)).replace('\\', '/'),
    'screenshotSha256': hashlib.sha256(screenshot.read_bytes()).hexdigest(),
}
(QA / 'hero-tower-xp-chrome.json').write_text(
    json.dumps(receipt, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'BROWSER TOTAL {passed}/{len(checks)} PASS; JS exceptions={len(errors)}')
if passed != len(checks):
    raise SystemExit(1)
