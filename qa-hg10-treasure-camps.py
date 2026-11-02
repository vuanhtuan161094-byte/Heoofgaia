"""Installed-Chrome file:// acceptance for the 2009 equipment-camp world sites."""
from pathlib import Path
import hashlib
import json
import os
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = Path(__file__).resolve().parent
GAME = ROOT / 'Play-Heoofgaia-HG11.html'
EVIDENCE = ROOT / 'docs' / 'evidence' / 'hg10'
REPORT = ROOT / 'docs' / 'qa' / 'hg10' / 'treasure-camps-chrome.json'
EVIDENCE.mkdir(parents=True, exist_ok=True)
REPORT.parent.mkdir(parents=True, exist_ok=True)
CHROME = Path(os.environ.get('PROGRAMFILES', 'C:/Program Files')) / 'Google' / 'Chrome' / 'Application' / 'chrome.exe'
checks, errors = [], []

def check(name, passed, detail=''):
    checks.append({'name': name, 'passed': bool(passed), 'detail': str(detail)})
    print(('PASS' if passed else 'FAIL'), name, detail)

if not GAME.is_file() or not CHROME.is_file():
    raise SystemExit(f'Missing offline game or Chrome: {GAME} / {CHROME}')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=str(CHROME), args=['--allow-file-access-from-files'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1100}, device_scale_factor=1)
    page = context.new_page()
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.goto(GAME.as_uri(), wait_until='load')
    check('Offline file opens with the Vietnamese product name', page.title().startswith('Anh Hùng Thời Loạn'), page.title())
    page.locator('[data-action="start"]').click()
    source = page.evaluate("""(()=>({count:HOG_ENGINE.TREASURE_CAMPS_2009.length,unique:new Set(HOG_ENGINE.TREASURE_CAMPS_2009.map(x=>x.key)).size,buttons:document.querySelectorAll('.treasure-level [data-kind=treasure]').length,levels:document.querySelectorAll('.treasure-level').length}))()""")
    check('Map exposes all 76 dated camp coordinates grouped by ten levels', source == {'count': 76, 'unique': 76, 'buttons': 76, 'levels': 10}, json.dumps(source))

    # Open the contradictory level-6 guide entry and show its literal values before dispatch.
    page.locator('.treasure-level').nth(5).locator('summary').click()
    page.locator('.treasure-level').nth(5).locator('[data-action="select"][data-key="3,96"][data-kind="treasure"]').click()
    conflict = page.locator('.target-information').inner_text()
    check('Level-6 target preserves and discloses the 480,000 / 100,000 source contradiction',
          'Kho báu cấp 6' in conflict and '480.000' in conflict and '100.000' in conflict and 'nghi lỗi bài' in conflict,
          conflict.replace('\n', ' | ')[:700])
    page.evaluate("window.scrollTo(0,document.body.scrollHeight)")
    page.screenshot(path=str(EVIDENCE / 'treasure-camp-level6-conflict-chrome.png'), full_page=True)

    # Select the treasure overlay on the old prototype NPC at 10,8; both map targets must survive.
    page.locator('.treasure-level').nth(6).locator('summary').click()
    page.locator('.treasure-level').nth(6).locator('[data-action="select"][data-key="10,8"][data-kind="treasure"]').click()
    target_text = page.locator('.target-information').inner_text()
    check('10,8 treasure overlay selects level 7 and keeps both source force reports visible',
          'Kho báu cấp 7' in target_text and '960.000' in target_text and 'SRC47' in target_text and 'SRC20' in target_text,
          target_text.replace('\n', ' | ')[:700])
    march_button = page.locator('[data-action="march"][data-kind="treasure"]')
    check('Treasure uses the real enabled March control', march_button.count() == 1 and not march_button.is_disabled())
    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();s.army.human_1=60;s.formation=[{unitId:'human_1',count:60}];HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()""")
    ap_before = page.evaluate('HOG_APP_DEBUG.getState().ap')
    march_button.click()
    march = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {ap:s.ap,target:s.march?.target,targetKind:s.march?.targetKind,army:s.expedition?.army.human_1,valid:HOG_ENGINE.strictSave(s)}})()""")
    ap_delta = ap_before - march['ap']
    check('Dispatch spends 8 AP, removes troops into expedition state and saves the target type',
          abs(ap_delta-8)<.5 and march['target']=='10,8' and march['targetKind']=='treasure' and march['army']==60 and march['valid'],
          json.dumps({'beforeAP':ap_before,'afterAP':march['ap'],'deducted':ap_delta,**march}))
    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();s.march.remaining=.01;HOG_APP_DEBUG.save()})()""")
    page.reload(wait_until='load')
    page.wait_for_function("HOG_APP_DEBUG.getState()?.battle?.kind==='treasure'", timeout=8000)
    battle = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {kind:s.battle?.kind,level:s.battle?.level,target:s.battle?.target,name:s.battle?.name,valid:HOG_ENGINE.strictSave(s)}})()""")
    check('v07 browser reload advances the saved route into the actual level-7 treasure battle',
          battle == {'kind': 'treasure', 'level': 7, 'target': '10,8', 'name': 'Kho báu cấp 7', 'valid': True}, json.dumps(battle))
    page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=str(EVIDENCE / 'treasure-camp-level7-battle-chrome.png'), full_page=True)

    # Fixture only simplifies synthetic defenders; the game UI executes the attack turns and settlement.
    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();for(const a of s.battle.allies)a.range=20;for(const e of s.battle.enemies){e.hp=1;e.pool=1;e.count=1;e.atk=0;e.def=0}s.heroes.find(h=>h.id===s.activeHero).atk=1000;HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()""")
    turns = 0
    while page.evaluate('!!HOG_APP_DEBUG.getState().battle') and turns < 12:
        page.locator('[data-action="battle"][data-cmd="attack"]').click()
        turns += 1
    settled = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {battle:!!s.battle,cleared:s.treasureCleared.includes('10,8'),npcCleared:s.cleared.includes('10,8'),loot:s.inventory.length,origin:s.inventory[0]?.origin,returning:s.march?.phase,valid:HOG_ENGINE.strictSave(s),log:s.log.slice(0,12)}})()""")
    check('Live Attack actions settle treasure once, award an equipable modeled item and preserve the NPC target',
          not settled['battle'] and settled['cleared'] and not settled['npcCleared'] and settled['loot'] == 1 and 'Kho báu cấp 7' in settled['origin'] and settled['returning'] == 'return' and settled['valid'],
          json.dumps(settled, ensure_ascii=False))
    page.screenshot(path=str(EVIDENCE / 'treasure-camp-level7-settlement-chrome.png'), full_page=True)

    # Complete the return through the persisted timer, then equip using the real Heroes panel button.
    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();s.march.remaining=.01;HOG_APP_DEBUG.save()})()""")
    page.reload(wait_until='load')
    page.wait_for_function("!HOG_APP_DEBUG.getState()?.march && !HOG_APP_DEBUG.getState()?.expedition", timeout=8000)
    page.locator('#nav [data-tab="heroes"]').click()
    before = page.evaluate("HOG_ENGINE.heroStats(HOG_APP_DEBUG.getState()).atk + HOG_ENGINE.heroStats(HOG_APP_DEBUG.getState()).def + HOG_ENGINE.heroStats(HOG_APP_DEBUG.getState()).spd")
    equip = page.locator('[data-action="equipitem"]')
    check('Loot appears in the real Hero inventory panel with its modeled provenance', equip.count() == 1 and 'loot mô phỏng' in page.locator('.gear-card').inner_text(), page.locator('.gear-card').inner_text() if equip.count() else 'no item card')
    equip.click()
    after = page.evaluate("HOG_ENGINE.heroStats(HOG_APP_DEBUG.getState()).atk + HOG_ENGINE.heroStats(HOG_APP_DEBUG.getState()).def + HOG_ENGINE.heroStats(HOG_APP_DEBUG.getState()).spd")
    check('Equip action changes the live hero combat stats', after > before, f'{before} → {after}')
    page.locator('#save').click()
    page.reload(wait_until='load')
    persisted = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {version:s.version,cleared:s.treasureCleared.includes('10,8'),loot:s.inventory.length,equipment:Object.values(s.equipment[s.activeHero]||{}).length,valid:HOG_ENGINE.strictSave(s)}})()""")
    check('Treasure completion, returned troops and equipped loot persist in the unchanged v07 save',
          persisted['version'] == 7 and persisted['cleared'] and persisted['loot'] == 1 and persisted['equipment'] == 1 and persisted['valid'], json.dumps(persisted))
    page.locator('#nav [data-tab="heroes"]').click()
    page.screenshot(path=str(EVIDENCE / 'treasure-camp-equipped-hero-chrome.png'), full_page=True)
    check('No browser JavaScript exceptions during real offline play', not errors, '; '.join(errors))
    context.close()
    browser.close()

html_sha = hashlib.sha256(GAME.read_bytes()).hexdigest().upper()
receipt = {'suite': 'HG-10 dated gear-camp gameplay', 'game': 'Anh Hùng Thời Loạn', 'browser': 'Installed Chrome, actual file://', 'htmlSha256': html_sha, 'fixtureDisclosure': 'The test seeds 60 T1 troops and sets synthetic defenders to one hit point after the battle opens. March, save/reload, battle actions, exact-once settlement, item generation, return and equip actions use real engine/UI flows. Treasure loot table/stats remain simulated.', 'checks': checks, 'errors': errors, 'screenshots': [str((EVIDENCE / name).relative_to(ROOT)).replace('\\', '/') for name in ['treasure-camp-level6-conflict-chrome.png','treasure-camp-level7-battle-chrome.png','treasure-camp-level7-settlement-chrome.png','treasure-camp-equipped-hero-chrome.png']]}
REPORT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False), encoding='utf-8')
passed = sum(x['passed'] for x in checks)
print(f'CHROME TOTAL {passed}/{len(checks)} PASS; JS exceptions={len(errors)}; HTML SHA256={html_sha}')
raise SystemExit(0 if passed == len(checks) else 1)
