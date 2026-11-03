"""Actual offline Chrome controls: automatic advance collision and blocked retreat."""
from pathlib import Path
import json, hashlib, sys
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).resolve().parent
shot=root/'docs/evidence/hg09/collision-detour-chrome.png'
receipt=root/'docs/qa/hg09/collision-detour-chrome.json'
checks=[];errors=[]
def check(name,ok):
    checks.append({'name':name,'passed':bool(ok)})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.set_default_timeout(8000)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((root/'Play-Heoofgaia-HG11.html').as_uri())
    page.locator('[data-action="start"]').click()
    page.evaluate('''()=>{const s=HOG_APP_DEBUG.getState();HOG_ENGINE.setFormation(s,[{unitId:'human_1',count:8},{unitId:'human_1',count:8}]);const t=HOG_ENGINE.NPC_CAMPS_2009.find(t=>t.stars===1);HOG_ENGINE.startMarch(s,t.key);HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()}''')
    check('Real formation, March and travel create a two-stack NPC battle',page.evaluate('HOG_APP_DEBUG.getState().battle.allies.length===2'))
    page.evaluate('''()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;for(const u of b.allies){u.hp=10000;u.pool=u.count*u.hp;u.atk=0;u.spd=4}Object.assign(b.allies[0],{x:1,y:1,range:1});Object.assign(b.allies[1],{x:2,y:1,range:20});b.enemies=b.enemies.slice(0,1);Object.assign(b.enemies[0],{x:5,y:1,range:20,atk:0,hp:10000,pool:b.enemies[0].count*10000});b.selected='p0';HOG_APP_DEBUG.render()}''')
    page.locator('[data-action="battle"][data-cmd="advance"]').click()
    check('Actual Advance control detours around the living blocker',page.evaluate('(()=>{const b=HOG_APP_DEBUG.getState().battle;return b.allies[0].x===1&&b.allies[0].y===2&&b.allies[1].x===2&&b.allies[1].y===1})()'))
    page.locator('#save').click();page.reload()
    check('v07 reload preserves the detour and both live stacks',page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.version===7&&s.battle.allies[0].y===2&&HOG_ENGINE.strictSave(s)})()'))
    for _ in range(5):
        page.locator('[data-action="battle"][data-cmd="advance"]').click()
    check('Further actual Advance turns reach melee range without overlap',page.evaluate('(()=>{const b=HOG_APP_DEBUG.getState().battle,a=b.allies[0],e=b.enemies[0],live=[...b.allies,...b.enemies].filter(u=>u.pool>0);return Math.abs(a.x-e.x)+Math.abs(a.y-e.y)===1&&new Set(live.map(u=>`${u.x},${u.y}`)).size===live.length})()'))
    page.screenshot(path=str(shot),full_page=True)
    page.evaluate('''()=>{const b=HOG_APP_DEBUG.getState().battle;Object.assign(b.allies[0],{x:2,y:1});Object.assign(b.allies[1],{x:1,y:1});HOG_APP_DEBUG.render()}''')
    page.locator('[data-action="battle"][data-cmd="retreat"]').click()
    check('Actual Retreat holds when a living friendly stack blocks the rear cell',page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.battle.allies[0].x===2&&s.battle.allies[1].x===1&&HOG_ENGINE.strictSave(s)})()'))
    check('No JavaScript page errors',not errors)
    browser.close()
result={'total':len(checks),'passed':sum(x['passed'] for x in checks),'errors':errors,'checks':checks,
 'fixtureDisclosure':'Actual file:// Human game uses its existing 16 troops in two real formation stacks, dispatches via engine March and travel. Only battlefield positions, durability, attack/speed and blocker ranged reach are fixture-adjusted to isolate collision. No movement result or victory is injected. Advance and Retreat use actual UI controls; Save/Reload uses browser v07 persistence.',
 'screenshot':str(shot.relative_to(root)).replace('\\','/'),'screenshotSha256':hashlib.sha256(shot.read_bytes()).hexdigest().upper()}
receipt.parent.mkdir(parents=True,exist_ok=True)
receipt.write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
print(f'TOTAL {result["passed"]}/{result["total"]} PASS')
raise SystemExit(0 if result['total']==result['passed'] else 1)
