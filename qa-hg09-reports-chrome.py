"""Real starter-army mine battle, persisted report, read-only review and narrow layout."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib,json,sys
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).resolve().parent
shot=root/'docs/evidence/hg09/mine-battle-report-chrome.png'
mobile=root/'docs/evidence/hg09/mine-battle-report-mobile-chrome.png'
checks=[];errors=[]
def check(name,ok):
    checks.append({'name':name,'passed':bool(ok)});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.set_default_timeout(8000)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((root/'Play-Heoofgaia-HG11.html').as_uri())
    page.locator('[data-action="start"]').click()
    page.locator('#nav [data-tab="reports"]').click()
    check('Fresh offline game has a real empty report history',page.evaluate('HOG_APP_DEBUG.getState().battleReports.length===0') and 'Chưa có trận' in page.locator('#main').inner_text())
    page.locator('#nav [data-tab="map"]').click()
    point=page.evaluate('''()=>{const c=document.querySelector('#world-canvas'),r=c.getBoundingClientRect(),m=HOG_PAINTER.miniBounds(c),pad=9;return {x:r.left+(m.x+pad+6.5*(m.w-2*pad)/100)/c.width*r.width,y:r.top+(m.y+pad+3.5*(m.h-2*pad)/100)/c.height*r.height}}''')
    page.mouse.click(point['x'],point['y'])
    page.locator('[data-action="march"]').click()
    page.evaluate('''()=>{const s=HOG_APP_DEBUG.getState();HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()}''')
    check('Actual map pointer, March and travel open the starter mine encounter',page.evaluate('HOG_APP_DEBUG.getState().battle.target==="6,3"'))
    for _ in range(72):
        if not page.evaluate('!!HOG_APP_DEBUG.getState().battle'): break
        page.locator('[data-action="battle"][data-cmd="attack"]').click()
    check('Real starter troops naturally win and station at the mine',page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return !s.battle&&s.mines.some(m=>m.key==="6,3")&&s.stationedHeroes.some(h=>h.key==="6,3")})()'))
    report=page.evaluate('HOG_APP_DEBUG.getState().battleReports[0]')
    check('Exactly one final report describes the victory and garrison',report['outcome']=='win' and report['kind']=='mine' and report['disposition']=='stationed' and report['target']=='6,3' and page.evaluate('HOG_APP_DEBUG.getState().battleReports.length===1'))
    check('Report survivors and Arena wounded match the actual army ledger',page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState(),r=s.battleReports[0],a=r.allies[0],g=s.stationedHeroes[0];return a.initial===16&&a.survived===g.army.human_1&&a.lost===16-a.survived&&a.wounded===(s.wounded.human_1||0)})()'))
    check('Mine report records actual Fame and hero XP without invented resource loot',report['fame']==10 and report['heroXp']>0 and all(v==0 for v in report['resources'].values()))
    page.locator('#nav [data-tab="reports"]').click()
    check('Report UI renders the real receipt, troop tables and award totals',page.locator('[data-report-id]').count()==1 and 'Chiến thắng' in page.locator('#main').inner_text() and page.locator('.battle-report-table').count()==2)
    check('Gear receipt and UI match the actual empty first-mine drop',report['items']==[] and page.evaluate('HOG_APP_DEBUG.getState().inventory.length===0') and 'Không nhận trang bị' in page.locator('#main').inner_text())
    page.screenshot(path=str(shot),full_page=True)
    page.locator('#save').click();page.reload()
    page.locator('#nav [data-tab="reports"]').click()
    check('Actual browser v07 Save/Reload preserves the complete report',page.evaluate('HOG_APP_DEBUG.getState().battleReports[0]')==report and page.evaluate('HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())'))
    for _ in range(3):
        page.locator('#nav [data-tab="map"]').click();page.locator('#nav [data-tab="reports"]').click()
    check('Repeated review never duplicates the report, reward or mine',page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.battleReports.length===1&&s.mines.length===1&&s.fame===15&&s.stationedHeroes.length===1})()'))
    page.set_viewport_size({'width':390,'height':844})
    check('390px report stays readable without horizontal page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and page.locator('.battle-report-table').first.is_visible())
    page.screenshot(path=str(mobile),full_page=True)
    check('No JavaScript page errors',not errors)
    browser.close()
result={'command':'.venv\\Scripts\\python.exe qa-hg09-reports-chrome.py','inputHtml':'Play-Heoofgaia-HG11.html','inputHtmlSha256':hashlib.sha256((root/'Play-Heoofgaia-HG11.html').read_bytes()).hexdigest().upper(),'total':len(checks),'passed':sum(c['passed'] for c in checks),'errors':errors,'checks':checks,
 'fixtureDisclosure':'Normal file:// Human start, unchanged 16 starter troops. Actual minimap pointer selects mine 6,3, actual March and Attack controls produce natural victory. Only travel is advanced through the real engine tick. No resources, troop counts, positions, casualty, victory or report values are seeded. Browser Save/Reload and repeated real report navigation verify persistence and no second settlement.',
 'report':report,'screenshots':[{'path':str(s.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(s.read_bytes()).hexdigest().upper()} for s in [shot,mobile]]}
out=root/'docs/qa/hg09/battle-report-chrome.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
print(f'TOTAL {result["passed"]}/{result["total"]} PASS')
raise SystemExit(0 if result['passed']==result['total'] else 1)
