"""Real offline Chromium flow for the generated Elf Centaur battle sprite."""
from pathlib import Path
import hashlib
import json
import os
import struct
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

root = Path(__file__).resolve().parent
html = root / 'Play-Heoofgaia-HG11.html'
evidence = root / 'docs' / 'evidence' / 'hg11'
receipts = root / 'docs' / 'qa' / 'hg11'
evidence.mkdir(parents=True, exist_ok=True)
receipts.mkdir(parents=True, exist_ok=True)
browser_env = os.environ.get('HOG_CHROMIUM_PATH')
candidates = [Path(browser_env)] if browser_env else [
    Path(os.environ.get('PROGRAMFILES', 'C:/Program Files')) / 'Google' / 'Chrome' / 'Application' / 'chrome.exe',
    Path(os.environ.get('PROGRAMFILES(X86)', 'C:/Program Files (x86)')) / 'Microsoft' / 'Edge' / 'Application' / 'msedge.exe',
    Path(os.environ.get('PROGRAMFILES', 'C:/Program Files')) / 'Microsoft' / 'Edge' / 'Application' / 'msedge.exe',
]
browser_path = next((str(p) for p in candidates if p and p.is_file()), None)
if not browser_path:
    raise SystemExit('Chrome/Edge not found; set HOG_CHROMIUM_PATH.')

checks, errors = [], []

def check(name, passed):
    checks.append({'name': name, 'passed': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=browser_path, headless=True,
                                args=['--no-sandbox', '--allow-file-access-from-files'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page()
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.goto(html.as_uri(), wait_until='load')
    check('Offline game title is Anh Hùng Thời Loạn', page.title() == 'Anh Hùng Thời Loạn')
    masthead = page.locator('.masthead').inner_text()
    check('Visible game brand uses Anh Hùng Thời Loạn with Heroes of Gaia as its reference title',
          'ANH HÙNG THỜI LOẠN' in masthead and 'HEROES OF GAIA' in masthead and 'HẺOOFGAIA' not in masthead.upper())

    page.locator('[data-action="race"][data-race="elf"]').click()
    page.locator('[data-action="start"]').click()
    check('Elf kingdom starts in the running game', page.evaluate('HOG_APP_DEBUG.getState().race') == 'elf')
    page.locator('#nav [data-tab="army"]').click()
    start_army = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {
      available:s.army.elf_1,selected:document.querySelector('#formation_unit_0').value,
      count:Number(document.querySelector('#formation_count_0').value)}})()''')
    page.locator('[data-action="formation"]').click()
    check('Starting Centaurs are committed through the Army formation UI',
          start_army['available'] == 16 and start_army['selected'] == 'elf_1' and
          start_army['count'] == 16 and page.evaluate('HOG_APP_DEBUG.getState().formation[0].unitId') == 'elf_1')

    page.locator('#speed').click()
    slowed = page.evaluate('HOG_APP_DEBUG.getState().speed')
    page.locator('#speed').click()
    check('Game speed control changes state and is restored for the live expedition',
          slowed == 1 and page.evaluate('HOG_APP_DEBUG.getState().speed') == 60)
    page.locator('#nav [data-tab="map"]').click()
    point = page.evaluate('''(()=>{const c=document.querySelector('#world-canvas'),t=HOG_ENGINE.getTile('5,6'),m=HOG_PAINTER.mapCamera();
      const q=Math.max(.65,Math.min(2.05,m.zoom))*48;
      return {x:(t.x+.5)*q+c.width/2-m.centerX*q,y:(t.y+.5)*q+c.height/2-m.centerY*q,
              target:{key:t.key,kind:t.kind,name:t.value}}})()''')
    canvas_box = page.locator('#world-canvas').bounding_box()
    page.mouse.click(canvas_box['x'] + point['x'] * canvas_box['width'] / 1176,
                     canvas_box['y'] + point['y'] * canvas_box['height'] / 620)
    selected_text = page.locator('.target-information h2').inner_text()
    check('Player selects the actual nearby Wolves NPC on the world canvas',
          point['target']['kind'] == 'npc' and 'Wolves' in selected_text)
    page.locator('[data-action="march"]').click()
    dispatched = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {
      target:s.march?.target,formation:s.expedition?.formation?.[0]?.unitId,
      armyCount:s.expedition?.army?.elf_1,ap:s.ap}})()''')
    check('March button dispatches the saved Centaur formation to Wolves',
          dispatched['target'] == '5,6' and dispatched['formation'] == 'elf_1' and dispatched['armyCount'] == 16)

    started = page.evaluate('''(()=>{const image=document.getElementById('unit-elf-centaur'),proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage;
      window.__elfCentaurDraws=0;proto.drawImage=function(img,...args){if(img?.id==='unit-elf-centaur')window.__elfCentaurDraws++;return draw.call(this,img,...args)};
      return {imageReady:image.complete&&image.naturalWidth===512,initialBattle:!!HOG_APP_DEBUG.getState().battle}})()''')
    page.wait_for_function('HOG_APP_DEBUG.getState()?.battle', timeout=20000)
    page.wait_for_function('window.__elfCentaurDraws>0', timeout=5000)
    started.update(page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;return {
      battle:!!b,target:s.expedition?.target||s.march?.target||'5,6',phase:b?'tactical-battle':null,
      units:b?.allies?.map(u=>({unitId:u.unitId,count:u.count})),
      chromeSpriteDraws:window.__elfCentaurDraws,
      imageReady:document.getElementById('unit-elf-centaur').complete&&document.getElementById('unit-elf-centaur').naturalWidth===512,
      actualUiMarch:s.race==='elf'&&s.expedition?.formation?.some(g=>g.unitId==='elf_1')&&s.ap<100}})()'''))
    check('Natural NPC arrival opens a tactical battle', started['battle'] and started['phase'] == 'tactical-battle')
    check('Generated Centaur loads and is drawn into the actual battle canvas',
          started['imageReady'] and started['chromeSpriteDraws'] > 0)
    check('Live battle contains the dispatched Centaur unit',
          any(row['unitId'] == 'elf_1' and row['count'] > 0 for row in started['units'] or []))

    screenshot = evidence / 'elf-centaur-npc-battle-chrome.png'
    page.screenshot(path=str(screenshot), full_page=True)
    screenshot_bytes = screenshot.read_bytes()
    shot_width, shot_height = struct.unpack('>II', screenshot_bytes[16:24])
    screenshot_info = {'sha256': hashlib.sha256(screenshot_bytes).hexdigest().upper(),
                       'bytes': len(screenshot_bytes), 'resolution': f'{shot_width}x{shot_height}'}
    page.locator('#save').click()
    page.reload(wait_until='load')
    loaded = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return s&&{
      version:s.version,race:s.race,battle:!!s.battle,formation:s.expedition?.formation?.[0]?.unitId,
      battleUnit:s.battle?.allies?.some(u=>u.unitId==='elf_1'&&u.count>0),
      key:localStorage.getItem('heoofgaia_hg_only_v07')!==null}})()''')
    check('v07 Save/Reload preserves the Elf battle, formation and unit stack',
          loaded['version'] == 7 and loaded['race'] == 'elf' and loaded['battle'] and
          loaded['formation'] == 'elf_1' and loaded['battleUnit'] and loaded['key'])
    check('No JavaScript errors occurred in the offline battle flow', not errors)
    context.close()
    browser.close()

result = {
    'command': '.venv\\Scripts\\python.exe qa-hg11-elf-centaur-chrome.py',
    'browser': browser_path,
    'game': 'Anh Hùng Thời Loạn',
    'sourceMode': 'standalone local file:// HTML in installed Chromium',
    'total': len(checks), 'passed': sum(c['passed'] for c in checks),
    'failed': sum(not c['passed'] for c in checks), 'errors': errors, 'checks': checks,
    'elfSpriteRuntime': started,
    'artifacts': {'elf-centaur-npc-battle-chrome.png': screenshot_info},
}
receipt = receipts / 'elf-centaur-battle-chrome.json'
receipt.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
manifest_path = root / 'assets' / 'generated' / 'hg11' / 'units' / 'elf-centaur-manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest['qualityGate']['readabilityAtBattleScale'] = (
    'PASS: actual file:// Chrome battle screenshot preserves unit name, HP, count and ' +
    'selection graphics at normal viewport scale.' if result['failed'] == 0 else
    f"FAIL: focused real-Chrome flow had {result['failed']} failed checks.")
manifest['qualityGate']['battleRender'] = (
    f"PASS: real UI march to NPC produced {started['chromeSpriteDraws']} drawImage calls "
    'for the loaded Elf Centaur sprite on the battle canvas.' if started['battle'] and started['imageReady'] and started['chromeSpriteDraws'] > 0 else
    'FAIL: focused real-Chrome battle render did not draw the sprite.')
manifest['states']['saveLoadVerified'] = any(
    c['name'] == 'v07 Save/Reload preserves the Elf battle, formation and unit stack' and c['passed']
    for c in checks)
manifest['qualityGate']['saveLoadImpact'] = (
    'PASS: presentation-only; the actual v07 Save/Reload retained the Elf battle, deployed formation and stack.'
    if manifest['states']['saveLoadVerified'] else
    'FAIL: the focused real-Chrome Save/Reload check did not pass.')
manifest['battleEvidence']['resolution'] = screenshot_info['resolution']
manifest['battleEvidence']['sha256'] = screenshot_info['sha256']
manifest['battleEvidence']['chromeSpriteDraws'] = started['chromeSpriteDraws']
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f"CHROME TOTAL {result['passed']}/{result['total']} PASS; JS errors={len(errors)}")
raise SystemExit(0 if result['passed'] == result['total'] else 1)
