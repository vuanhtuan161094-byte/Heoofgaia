"""Real Chrome file:// acceptance for the separately-authored Human Barracks."""
from pathlib import Path
import hashlib
import json
import os
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent
html = root / 'Play-Heoofgaia-HG11.html'
evidence = root / 'docs' / 'evidence' / 'hg11'
receipts = root / 'docs' / 'qa' / 'hg11'
evidence.mkdir(parents=True, exist_ok=True)
receipts.mkdir(parents=True, exist_ok=True)
configured = os.environ.get('HOG_CHROMIUM_PATH')
candidates = [Path(configured)] if configured else [
    Path(os.environ.get('PROGRAMFILES', 'C:/Program Files')) / 'Google' / 'Chrome' / 'Application' / 'chrome.exe',
    Path(os.environ.get('PROGRAMFILES(X86)', 'C:/Program Files (x86)')) / 'Microsoft' / 'Edge' / 'Application' / 'msedge.exe',
]
browser_path = next((str(p) for p in candidates if p and p.is_file()), None)
if not browser_path:
    raise SystemExit('Chrome/Edge not found; set HOG_CHROMIUM_PATH.')

checks, errors = [], []
def check(name, ok):
    checks.append({'name': name, 'passed': bool(ok)})
    print(('PASS ' if ok else 'FAIL ') + name)

desktop_screenshot = evidence / 'human-barracks-building-detail-chrome.png'
mobile_screenshot = evidence / 'human-barracks-building-detail-mobile-chrome.png'
townhall_desktop_screenshot = evidence / 'human-town-hall-building-detail-chrome.png'
townhall_mobile_screenshot = evidence / 'human-town-hall-building-detail-mobile-chrome.png'
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=browser_path, headless=True, args=['--no-sandbox', '--allow-file-access-from-files'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page()
    page.set_default_timeout(8000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(html.as_uri(), wait_until='load')
    page.locator('[data-action="start"]').click()
    page.locator('#nav [data-tab="city"]').click()

    # Select the real Town Hall canvas hotspot and verify its independent image.
    canvas = page.locator('#city-canvas')
    site = page.evaluate('''(()=>{const c=document.querySelector('#city-canvas'),q=HOG_PAINTER.citySitesFor('human').find(x=>x[0]==='hall'),r=c.getBoundingClientRect();return {x:r.left+q[1]*r.width,y:r.top+q[2]*r.height}})()''')
    page.mouse.click(site['x'], site['y'])
    page.wait_for_function("""()=>{const i=document.querySelector('.building-art-preview img');return !!i&&i.complete&&i.naturalWidth===512&&i.naturalHeight===512}""")
    townhall = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),i=document.querySelector('.building-art-preview img'),r=i.getBoundingClientRect();return {version:s.version,race:s.race,level:s.buildings.hall,assetLoaded:i.complete&&i.naturalWidth===512,caption:document.querySelector('.building-art-preview figcaption')?.textContent,width:r.width,height:r.height,strict:HOG_ENGINE.strictSave(s)}})()''')
    check('The actual Human Town Hall canvas hotspot opens the Town Hall detail', 'Town Hall' in page.locator('.target-building-copy h2').inner_text() and townhall['race'] == 'human' and townhall['version'] == 7)
    check('512px independent Town Hall art loads from the offline bundle in Chrome', townhall['assetLoaded'] and townhall['caption'] == 'Tòa thị chính Nhân tộc' and townhall['width'] > 100 and townhall['height'] > 60 and townhall['strict'])
    page.screenshot(path=str(townhall_desktop_screenshot), full_page=True)

    # Follow the real Town Hall prerequisite; do not seed a higher city level.
    hall_button = page.locator('[data-action="upgrade"][data-key="hall"]')
    check('A fresh Human kingdom can start a paid Town Hall upgrade through its real UI', hall_button.is_enabled())
    hall_button.click()
    hall_queue = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {key:s.buildingQueue?.key,remaining:s.buildingQueue?.remaining,strict:HOG_ENGINE.strictSave(s)}})()''')
    check('Town Hall upgrade enters the normal construction queue', hall_queue['key'] == 'hall' and hall_queue['remaining'] > 0 and hall_queue['strict'])
    page.locator('#save').click()
    page.reload(wait_until='load')
    page.locator('#nav [data-tab="city"]').click()
    hall_restore = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {version:s.version,key:s.buildingQueue?.key,strict:HOG_ENGINE.strictSave(s)}})()''')
    check('v07 Save/Reload preserves the prerequisite Town Hall queue', hall_restore == {'version':7,'key':'hall','strict':True})
    page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();HOG_ENGINE.tick(s,s.lastTick+s.buildingQueue.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()})()''')
    hall_level = page.evaluate('HOG_APP_DEBUG.getState().buildings.hall')
    check('Real engine tick completes Town Hall level 2 before Barracks upgrade', hall_level == 2)

    canvas = page.locator('#city-canvas')
    site = page.evaluate('''(()=>{const c=document.querySelector('#city-canvas'),q=HOG_PAINTER.citySitesFor('human').find(x=>x[0]==='barracks'),r=c.getBoundingClientRect();return {x:r.left+q[1]*r.width,y:r.top+q[2]*r.height}})()''')
    page.mouse.click(site['x'], site['y'])
    preview = page.locator('.building-art-preview img')
    page.wait_for_function("""()=>{const i=document.querySelector('.building-art-preview img');return !!i&&i.complete&&i.naturalWidth===512&&i.naturalHeight===512}""")
    desktop = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),i=document.querySelector('.building-art-preview img'),r=i.getBoundingClientRect();return {version:s.version,race:s.race,level:s.buildings.barracks,assetLoaded:i.complete&&i.naturalWidth===512,assetAlt:i.alt,width:r.width,height:r.height,strict:HOG_ENGINE.strictSave(s)}})()''')
    check('Offline HTML starts the real Human city without script errors', page.title() == 'Anh Hùng Thời Loạn')
    check('The actual Human Barracks hotspot selects its separate building detail', 'Barracks' in page.locator('.target-building-copy h2').inner_text() and desktop['race'] == 'human')
    check('512px transparent Human Barracks runtime is embedded and visible in Chrome', desktop['assetLoaded'] and desktop['width'] > 100 and desktop['height'] > 60)
    check('Town Hall 2 prerequisite unlocks the real Barracks construction action', page.locator('[data-action="upgrade"][data-key="barracks"]').is_enabled())
    page.screenshot(path=str(desktop_screenshot), full_page=True)

    before = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),c=HOG_ENGINE.buildCost(s,'barracks');return {resources:{...s.res},cost:c,version:s.version}})()''')
    page.locator('[data-action="upgrade"][data-key="barracks"]').click()
    queued = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {key:s.buildingQueue?.key,level:s.buildingQueue?.level,remaining:s.buildingQueue?.remaining,total:s.buildingQueue?.total,resources:{...s.res},strict:HOG_ENGINE.strictSave(s)}})()''')
    paid = queued['key'] == 'barracks' and queued['level'] == 2 and queued['remaining'] > 0 and any(queued['resources'][k] < before['resources'][k] for k in before['resources'])
    check('Upgrading Barracks spends real resources and starts its construction queue', paid and queued['strict'])
    page.locator('#save').click()
    page.reload(wait_until='load')
    page.locator('#nav [data-tab="city"]').click()
    restored = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {version:s.version,key:s.buildingQueue?.key,level:s.buildingQueue?.level,remaining:s.buildingQueue?.remaining,strict:HOG_ENGINE.strictSave(s)}})()''')
    check('v07 Save/Reload keeps the paid Barracks queue and remaining time', restored['version'] == 7 and restored['key'] == 'barracks' and restored['level'] == 2 and 0 < restored['remaining'] <= queued['remaining'] and restored['strict'])
    page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();HOG_ENGINE.tick(s,s.lastTick+s.buildingQueue.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()})()''')
    completed = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {level:s.buildings.barracks,queue:s.buildingQueue,strict:HOG_ENGINE.strictSave(s)}})()''')
    check('A real engine tick completes Barracks construction exactly once', completed['level'] == 2 and completed['queue'] is None and completed['strict'])

    page.set_viewport_size({'width': 390, 'height': 844})
    page.reload(wait_until='load')
    page.locator('#nav [data-tab="city"]').click()
    page.locator('#main [data-action="building"][data-key="hall"]').click()
    page.wait_for_function("""()=>{const i=document.querySelector('.building-art-preview img');return !!i&&i.complete&&i.naturalWidth===512}""")
    townhall_mobile = page.evaluate('''(()=>{const i=document.querySelector('.building-art-preview img'),r=i.getBoundingClientRect();return {width:r.width,height:r.height,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}})()''')
    check('390px Town Hall detail keeps its independent art visible without horizontal overflow', townhall_mobile['width'] > 60 and townhall_mobile['height'] > 50 and townhall_mobile['scrollWidth'] <= townhall_mobile['viewport'] + 1)
    page.screenshot(path=str(townhall_mobile_screenshot), full_page=True)
    page.locator('#main [data-action="building"][data-key="barracks"]').click()
    page.wait_for_function("""()=>{const i=document.querySelector('.building-art-preview img');return !!i&&i.complete&&i.naturalWidth===512}""")
    mobile = page.evaluate('''(()=>{const i=document.querySelector('.building-art-preview img'),r=i.getBoundingClientRect();return {width:r.width,height:r.height,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}})()''')
    check('Responsive city detail keeps the separate Barracks art visible without horizontal page overflow', mobile['width'] > 60 and mobile['height'] > 50 and mobile['scrollWidth'] <= mobile['viewport'] + 1)
    page.screenshot(path=str(mobile_screenshot), full_page=True)
    check('No JavaScript page errors during building selection, queue, Save/Load and mobile view', not errors)
    context.close()
    browser.close()

def artifact(path):
    data = path.read_bytes()
    return {'path': path.relative_to(root).as_posix(), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest().upper(),
            'resolution': f'{int.from_bytes(data[16:20], "big")}x{int.from_bytes(data[20:24], "big")}'}

result = {
    'command': '.venv\\Scripts\\python.exe qa-hg11-human-building-chrome.py',
    'browser': browser_path,
    'total': len(checks),
    'passed': sum(c['passed'] for c in checks),
    'failed': sum(not c['passed'] for c in checks),
    'errors': errors,
    'checks': checks,
    'fixtureDisclosure': 'Chrome opens the actual bundled file:// game and starts a normal Human kingdom. The real UI pays for Town Hall 2 and saves/reloads its v07 construction queue, then completes it through the game clock. The test clicks the Town Hall canvas site and verifies its independent sprite, pays for Town Hall 2, saves/reloads its v07 queue, then clicks the Barracks site, pays for Barracks 2, saves/reloads its queue and completes both with engine ticks. It checks both building sprites at 390px width. No building level, resource balance, queue result or construction result is injected.',
    'offlineBundleSha256': hashlib.sha256(html.read_bytes()).hexdigest().upper(),
    'screenshots': [artifact(townhall_desktop_screenshot), artifact(desktop_screenshot), artifact(townhall_mobile_screenshot), artifact(mobile_screenshot)],
}
receipt = receipts / 'human-barracks-building-chrome.json'
receipt.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'CHROME TOTAL {result["passed"]}/{result["total"]} PASS; JS errors={len(errors)}')
raise SystemExit(0 if result['passed'] == result['total'] else 1)
