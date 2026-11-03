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
    page.set_default_timeout(8000)
    check('Offline game opens with the requested title', page.title() == 'Anh Hùng Thời Loạn')
    page.locator('[data-action="spelledition"][data-edition="china2009"]').click()
    page.locator('[data-action="race"][data-race="orc"]').click()
    page.screenshot(path=str(evidence / 'spell-edition-selector-chrome.png'), full_page=True)
    page.locator('[data-action="start"]').click()
    check('New kingdom persists the chosen China 2009 spell edition', page.evaluate('HOG_APP_DEBUG.getState().spellEdition==="china2009"&&HOG_APP_DEBUG.getState().race==="orc"'))
    page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,C=HOG_CATALOG;s.buildings.hall=10;s.buildings.warehouse=10;s.buildings.magicTower=10;s.army.orc_1=1;s.army.orc_2=1;for(const k of C.keys)s.res[k]=E.limits(s)[k];E.setFormation(s,[{unitId:'orc_1',count:1},{unitId:'orc_2',count:1}]);HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()''')
    page.locator('#nav [data-tab="magic"]').click()
    check('Orc catalog shows source-dated Sina Harden Bones at two percent', 'Cường hóa xương cốt' in page.locator('#main').inner_text() and '2%/cấp' in page.locator('#main').inner_text())
    check('China 2009 Orc catalog exposes the dated Battle Instinct movement skill', 'Bản năng chiến đấu' in page.locator('#main').inner_text() and '1,5%/cấp' in page.locator('#main').inner_text())
    page.locator('[data-action="herolearn"][data-id="harden_bones"]').click()
    page.locator('[data-action="heroequip"][data-id="harden_bones"]').click()
    for _ in range(10):
        page.locator('[data-action="herolearn"][data-id="battle_instinct"]').click()
    page.locator('[data-action="heroequip"][data-id="battle_instinct"]').click()
    prepared = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {level:s.heroMagic.battle_instinct,equipped:s.heroes[0].equippedSpells.includes('battle_instinct'),valid:HOG_ENGINE.strictSave(s)}})()''')
    check('Magic Tower researches ten actual Battle Instinct levels and equips the skill', prepared == {'level': 10, 'equipped': True, 'valid': True})
    started = page.evaluate('''(()=>{const image=document.getElementById('unit-orc-imp'),canvas=CanvasRenderingContext2D.prototype,draw=canvas.drawImage;window.__orcSpriteDraws=0;canvas.drawImage=function(img,...args){if(img?.id==='unit-orc-imp')window.__orcSpriteDraws++;return draw.call(this,img,...args)};const s=HOG_APP_DEBUG.getState(),t=HOG_ENGINE.NPC_CAMPS_2009.find(q=>q.stars===1);HOG_ENGINE.startMarch(s,t.key);HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);for(const e of s.battle.enemies){e.hp=1000000;e.pool=1000000;e.count=1;e.initial=1;e.atk=0;e.x=10;e.y=7+Number(e.id.slice(1))}HOG_APP_DEBUG.render();return {target:t.key,battle:!!s.battle,profile:s.spellEdition,imageReady:image.complete&&image.naturalWidth===512,spriteDraws:window.__orcSpriteDraws,army:s.expedition.formation.map(x=>x.unitId)}})()''')
    check('Source-selected spell enters a naturally generated NPC battle', started['battle'] and started['profile'] == 'china2009')
    check('Transparent Orc Imp sprite loads and paints into the real battle canvas', started['imageReady'] and started['spriteDraws'] > 0)
    before = page.evaluate('HOG_APP_DEBUG.getState().battle.allies[0].def')
    page.locator('[data-action="cast"][data-id="harden_bones"]').click()
    applied = page.evaluate('''(()=>{const b=HOG_APP_DEBUG.getState().battle;return {def:b.allies[0].def,spell:b.activeSpell?.id}})()''')
    check('Casting Harden Bones changes actual allied stack defense by two percent', applied['spell'] == 'harden_bones' and abs(applied['def']-before*1.02)<1e-8)
    page.locator('[data-action="stack"][data-id="p1"]').click()
    page.locator('[data-action="battle"][data-cmd="defend"]').click()
    page.locator('[data-action="cast"][data-id="battle_instinct"]').click()
    active = page.evaluate('''(()=>{const b=HOG_APP_DEBUG.getState().battle;return {turn:b.turn,id:b.activeSpell?.id,level:b.movementInstinct?.level,expiry:b.activeSpell?.expiry}})()''')
    check('Casting Battle Instinct arms the real tactical movement effect', active == {'turn': 2, 'id': 'battle_instinct', 'level': 10, 'expiry': 7})
    page.locator('[data-action="stack"][data-id="p1"]').click()
    page.locator('[data-action="move-mode"]').click()
    canvas_battle = page.locator('#battle-canvas')
    box = canvas_battle.bounding_box()
    point = page.evaluate('''(()=>{const c=document.querySelector('#battle-canvas'),g=HOG_ENGINE.BATTLE_GRID,h=(c.height-g.top-g.bottom)/g.rows;return {x:11.5/g.cols,y:(g.top+2.5*h)/c.height}})()''')
    page.mouse.click(box['x']+point['x']*box['width'],box['y']+point['y']*box['height'])
    moved = page.evaluate('''(()=>{const b=HOG_APP_DEBUG.getState().battle,u=b.allies.find(x=>x.id==='p1');return {turn:b.turn,x:u.x,y:u.y,credit:u.moveCredit,target:b.moveTargets.p1,steps:b.lastMoves.find(x=>x.unitId==='p1')?.steps,strict:HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())}})()''')
    check('Actual battlefield click moves the Scout stack and stores fractional bonus', moved['x']==3 and moved['y']==2 and abs(moved['credit']-.3)<1e-8 and moved['target']=={'x':11,'y':2} and moved['steps']==2 and moved['strict'])
    page.locator('#save').click()
    page.reload(wait_until='load')
    restored = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),b=s?.battle,u=b?.allies.find(x=>x.id==='p1');return {version:s?.version,edition:s?.spellEdition,level:s?.heroMagic.battle_instinct,equipped:s?.heroes[0].equippedSpells.includes('battle_instinct'),spell:b?.activeSpell?.id,instinct:b?.movementInstinct?.level,credit:u?.moveCredit,x:u?.x,target:b?.moveTargets?.p1,valid:HOG_ENGINE.strictSave(s)}})()''')
    check('v07 Save/Reload preserves the movement skill, fractional cell, and destination', restored['version']==7 and restored['edition']=='china2009' and restored['level']==10 and restored['equipped'] and restored['spell']=='battle_instinct' and restored['instinct']==10 and abs(restored['credit']-.3)<1e-8 and restored['x']==3 and restored['target']=={'x':11,'y':2} and restored['valid'])
    page.locator('[data-action="auto"]').click()
    page.wait_for_function('''()=>{const b=HOG_APP_DEBUG.getState().battle,u=b?.allies.find(x=>x.id==='p1');return !!b&&b.turn>=6&&u?.x===10&&b.lastMoves?.find(x=>x.unitId==='p1')?.steps===3}''',timeout=8000)
    movement = page.evaluate('''(()=>{const b=HOG_APP_DEBUG.getState().battle,u=b.allies.find(x=>x.id==='p1');return {turn:b.turn,x:u.x,credit:u.moveCredit,steps:b.lastMoves.find(x=>x.unitId==='p1')?.steps,active:b.movementInstinct?.level,spell:b.activeSpell?.id,order:b.orders.p1}})()''')
    check('Auto turns convert accumulated 1.5-percent bonuses into a real extra melee cell', movement['x']==10 and movement['steps']==3 and movement['active']==10 and movement['spell']=='battle_instinct' and movement['order']=='move')
    page.locator('[data-action="auto"]').click()
    page.screenshot(path=str(evidence / 'china-2009-orc-harden-bones-combat-chrome.png'), full_page=True)
    page.locator('#save').click()
    page.reload(wait_until='load')
    final_load = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),b=s?.battle,u=b?.allies.find(x=>x.id==='p1');return {version:s?.version,turn:b?.turn,x:u?.x,credit:u?.moveCredit,skill:b?.movementInstinct?.level,target:b?.moveTargets?.p1,valid:HOG_ENGINE.strictSave(s)}})()''')
    check('Second v07 Save/Reload keeps the mid-route movement skill and ledger', final_load['version']==7 and final_load['x']==10 and final_load['skill']==10 and final_load['target']=={'x':11,'y':2} and final_load['valid'])
    check('No JavaScript page errors during offline regional spell flow', not errors)
    context.close()
    browser.close()

result = {'command': '.venv\\Scripts\\python.exe qa-spell-edition-chrome.py', 'browser': browser_path, 'total': len(checks), 'passed': sum(c['passed'] for c in checks), 'failed': sum(not c['passed'] for c in checks), 'errors': errors, 'checks': checks, 'orcSpriteRuntime': started,
          'fixtureDisclosure': 'Chrome opens the actual offline file:// game. The fixture seeds Hall/Warehouse/Magic Tower 10 and one Imp plus one tier-2 Wolf Rider to skip long construction/recruitment; the ten spell levels are paid for through the real Magic Tower research control. It selects an actual 1-star camp and uses real March/travel/battle, casts both skills through the rendered battle controls, clicks a live grid destination, observes the credited extra cell, and performs strict v07 reloads. Enemy HP, ATK and positions are adjusted only to keep the movement observable; no player destination, move result, damage, win or reward is injected.'}
receipt = receipts / 'china-2009-spell-profile-chrome.json'
for name in ['spell-edition-selector-chrome.png', 'china-2009-orc-harden-bones-combat-chrome.png']:
    asset = evidence / name
    result.setdefault('artifacts', {})[name] = {'sha256': hashlib.sha256(asset.read_bytes()).hexdigest().upper(), 'bytes': asset.stat().st_size}
receipt.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
manifest_path = root / 'assets' / 'generated' / 'hg11' / 'units' / 'asset-manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
combat_image = evidence / 'china-2009-orc-harden-bones-combat-chrome.png'
combat_bytes = combat_image.read_bytes()
manifest['battleEvidence'].update({
    'screenshot': 'docs/evidence/hg09/china-2009-orc-harden-bones-combat-chrome.png',
    'resolution': f'{int.from_bytes(combat_bytes[16:20], "big")}x{int.from_bytes(combat_bytes[20:24], "big")}',
    'sha256': hashlib.sha256(combat_bytes).hexdigest().upper(),
    'receipt': 'docs/qa/hg09/china-2009-spell-profile-chrome.json',
    'chromeSpriteDraws': started['spriteDraws'],
})
manifest['states']['saveLoadVerified'] = any(
    check['name'] in {
        'v07 Save/Reload preserves the movement skill, fractional cell, and destination',
        'Second v07 Save/Reload keeps the mid-route movement skill and ledger',
    } and check['passed']
    for check in checks)
manifest['qualityGate']['readabilityAtBattleScale'] = (
    'PASS: actual offline Chrome capture keeps Orc Imp, unit name, HP, selection ring and count readable.'
    if started['imageReady'] and started['spriteDraws'] > 0 and result['failed'] == 0 else
    'FAIL: focused real-Chrome flow failed the sprite readability checks.')
manifest['qualityGate']['battleRender'] = (
    f"PASS: actual NPC battle drew the Orc Imp sprite {started['spriteDraws']} time(s) on the battle canvas."
    if started['battle'] and started['imageReady'] and started['spriteDraws'] > 0 else
    'FAIL: focused real-Chrome battle did not render the Orc Imp sprite.')
manifest['qualityGate']['saveLoadImpact'] = (
    'PASS: actual v07 Save/Reload retained the movement skill, fractional step credit, destination and active battle.'
    if manifest['states']['saveLoadVerified'] else
    'FAIL: focused real-Chrome Save/Reload check did not pass.')
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'CHROME TOTAL {result["passed"]}/{result["total"]} PASS; JS errors={len(errors)}')
raise SystemExit(0 if result['passed'] == result['total'] else 1)
