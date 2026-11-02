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
    check('Offline HTML opens in installed Chrome from file://',
          page.title().startswith('Anh Hùng Thời Loạn'), page.title())

    page.locator('[data-action="start"]').click()
    page.locator('#nav [data-tab="city"]').click()
    page.evaluate('''(()=>{
      const s=HOG_APP_DEBUG.getState();
      s.buildings.warehouse=10;
      s.buildings.hall=6;
      s.buildings.heroTower=7;
      s.buildings.tavern=9;
      for(const k of HOG_CATALOG.keys)s.res[k]=HOG_ENGINE.limits(s)[k];
      HOG_APP_DEBUG.render();
    })()''')

    page.locator('[data-action="building"][data-key="heroTower"]').click()
    tower_locked_text = page.locator('#main').inner_text()
    check('Hero Tower level 8 stays locked below Town Hall 7',
          page.locator('[data-action="upgrade"]').is_disabled() and 'Town Hall cấp 7' in tower_locked_text,
          tower_locked_text[-180:])
    page.screenshot(path=str(EVIDENCE / 'hero-tower-8-locked-chrome.png'), full_page=True)

    page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();s.buildings.hall=7;HOG_APP_DEBUG.render()})()''')
    page.locator('[data-action="building"][data-key="tavern"]').click()
    locked_text = page.locator('#main').inner_text()
    locked = page.locator('[data-action="upgrade"]').is_disabled()
    reason = 'Tháp tướng cấp 8' in locked_text
    check('Tavern level 10 shows its sourced Hero Tower 8 / Town Hall 7 lock',
          locked and reason, locked_text[-480:])
    page.screenshot(path=str(EVIDENCE / 'tavern-10-locked-chrome.png'), full_page=True)

    page.locator('[data-action="building"][data-key="heroTower"]').click()
    check('Hero Tower level 8 is enabled at Town Hall 7',
          not page.locator('[data-action="upgrade"]').is_disabled(),
          page.locator('#main').inner_text()[-240:])
    page.locator('[data-action="upgrade"]').click()
    queue = page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return {key:s.buildingQueue?.key,level:s.buildingQueue?.level,valid:HOG_ENGINE.strictSave(s),version:s.version}})()')
    check('Real Hero Tower 8 construction enters the v07 building queue',
          queue['key'] == 'heroTower' and queue['level'] == 8 and queue['valid'] and queue['version'] == 7,
          json.dumps(queue, ensure_ascii=False))

    page.evaluate('''(()=>{
      const s=HOG_APP_DEBUG.getState();
      // The UI created a real timed queue above. Advance a short synthetic game-time slice
      // while keeping lastTick within the strict save validator's five-minute clock window.
      s.speed=60;s.buildingQueue.remaining=0.5;s.lastTick=Date.now();
      HOG_ENGINE.tick(s,Date.now()+1000);
      HOG_APP_DEBUG.render();
    })()''')
    completed = page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return {heroTower:s.buildings.heroTower,queue:s.buildingQueue,gate:HOG_ENGINE.buildingUpgradeGate(s,"tavern")}})()')
    check('Completing Hero Tower 8 unlocks Tavern 10',
          completed['heroTower'] == 8 and completed['queue'] is None and completed['gate']['allowed'],
          json.dumps(completed, ensure_ascii=False))

    page.locator('[data-action="building"][data-key="tavern"]').click()
    check('Tavern level 10 upgrade is enabled after its prerequisites complete',
          not page.locator('[data-action="upgrade"]').is_disabled())
    page.locator('[data-action="upgrade"]').click()
    queued = page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return {key:s.buildingQueue?.key,level:s.buildingQueue?.level,valid:HOG_ENGINE.strictSave(s),version:s.version}})()')
    check('Tavern level 10 enters a real construction queue',
          queued['key'] == 'tavern' and queued['level'] == 10 and queued['valid'] and queued['version'] == 7,
          json.dumps(queued, ensure_ascii=False))
    page.wait_for_timeout(3200)
    page.screenshot(path=str(EVIDENCE / 'tavern-10-queue-chrome.png'), full_page=True)
    page.locator('#save').click()
    page.reload(wait_until='load')
    page.locator('#nav [data-tab="city"]').click()
    page.locator('[data-action="building"][data-key="tavern"]').click()
    restored = page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return {version:s.version,heroTower:s.buildings.heroTower,tavern:s.buildings.tavern,queue:s.buildingQueue?.key,level:s.buildingQueue?.level,valid:HOG_ENGINE.strictSave(s)}})()')
    check('Real file:// Save/Reload preserves the queued Tavern 10 upgrade in v07',
          restored['version'] == 7 and restored['heroTower'] == 8 and restored['tavern'] == 9 and
          restored['queue'] == 'tavern' and restored['level'] == 10 and restored['valid'],
          json.dumps(restored, ensure_ascii=False))
    check('No JavaScript errors during building prerequisite flow', not errors, '; '.join(errors))
    browser.close()

passed = sum(item['passed'] for item in checks)
receipt = {
    'suite': 'HG-08 source-backed Tavern 10 construction gate',
    'source': 'installed Google Chrome, actual standalone HTML via file://; real building UI and timed queues; fixture seeds prerequisites/resources',
    'total': len(checks), 'passed': passed, 'failed': len(checks) - passed,
    'errors': errors, 'checks': checks,
}
(QA / 'tavern-level-10-prerequisite-chrome.json').write_text(
    json.dumps(receipt, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'BROWSER TOTAL {passed}/{len(checks)} PASS; JS exceptions={len(errors)}')
if passed != len(checks):
    raise SystemExit(1)
