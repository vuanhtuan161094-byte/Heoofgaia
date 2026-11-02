"""HG-08 browser acceptance with real Chromium rendering and test-only storage shim.
Run: python qa-browser.py. Browser file:// and localhost are blocked by the sandbox, so
set_content is used. This tests actual HTML/CSS/JS behavior but not physical file launch.
"""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
import json, traceback, sys
folder=Path(__file__).parent
evidence=folder/'docs'/'evidence'/'hg08'
evidence.mkdir(parents=True,exist_ok=True)
html=(folder/'Play-Heoofgaia-HG08.html').read_text(encoding='utf-8')
checks=[];errors=[]
def check(name,expr):
    try:
        assert expr(),name
        print('PASS',name);checks.append((name,True))
    except Exception as e:
        print('FAIL',name,str(e));checks.append((name,False))
with sync_playwright() as p:
    executable=os.environ.get('HOG_CHROMIUM_PATH')
    if not executable:
        candidates=[
            Path(os.environ.get('PROGRAMFILES','C:/Program Files'))/'Google'/'Chrome'/'Application'/'chrome.exe',
            Path(os.environ.get('PROGRAMFILES(X86)','C:/Program Files (x86)'))/'Microsoft'/'Edge'/'Application'/'msedge.exe',
            Path(os.environ.get('PROGRAMFILES','C:/Program Files'))/'Microsoft'/'Edge'/'Application'/'msedge.exe',
        ]
        executable=next((str(path) for path in candidates if path.is_file()),None)
    if executable and not Path(executable).is_file():
        raise SystemExit(f'HOG_CHROMIUM_PATH does not exist: {executable}')
    print('Browser executable:',executable or 'Playwright bundled Chromium')
    browser=p.chromium.launch(headless=True,executable_path=executable,args=['--no-sandbox','--disable-dev-shm-usage'])
    def launch(viewport,store=None):
        page=browser.new_page(viewport=viewport,device_scale_factor=1)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('about:blank')
        init="""window.__qaStore=JSON.parse(arguments[0]);Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return Object.prototype.hasOwnProperty.call(window.__qaStore,k)?window.__qaStore[k]:null},setItem(k,v){window.__qaStore[k]=String(v)},removeItem(k){delete window.__qaStore[k]}}})"""
        page.evaluate('(seed) => {window.__qaStore=seed; Object.defineProperty(window,"localStorage",{configurable:true,value:{getItem(k){return Object.prototype.hasOwnProperty.call(window.__qaStore,k)?window.__qaStore[k]:null},setItem(k,v){window.__qaStore[k]=String(v)},removeItem(k){delete window.__qaStore[k]}}})}',store or {})
        page.set_content(html,wait_until='load',timeout=20000)
        return page
    d=launch({'width':1440,'height':900})
    check('Intro title',lambda:d.title().startswith('Hẻoofgaia HG-08'))
    check('No JS exception on intro',lambda:not errors)
    check('4 race selection buttons',lambda:d.locator('[data-action="race"]').count()==4)
    d.locator('[data-action="race"][data-race="elf"]').click()
    d.locator('[data-action="start"]').click()
    check('New game respects selected race',lambda:d.evaluate('HOG_APP_DEBUG.getState().race')=='elf')
    check('Top resource bar contains 5 resources',lambda:d.locator('#resources .resource').count()==5)
    check('World canvas visible',lambda:d.locator('#world-canvas').is_visible())
    check('World map 28 × 18',lambda:d.evaluate('HOG_ENGINE.WIDTH===28&&HOG_ENGINE.HEIGHT===18'))
    d.screenshot(path=str(evidence/'screenshot-world-desktop.png'),full_page=True)
    d.locator('#nav [data-tab="city"]').click()
    check('City canvas visible',lambda:d.locator('#city-canvas').is_visible())
    check('Elf city exposes its attested race buildings',lambda:d.locator('[data-action="building"][data-key="magicPool"]').count()==1 and d.locator('[data-action="building"][data-key="natureTower"]').count()==1 and d.locator('[data-action="building"][data-key="darkHall"]').count()==0)
    check('Market selectable as construction',lambda:d.locator('[data-action="building"][data-key="market"]').count()==1)
    d.locator('[data-action="building"][data-key="market"]').click()
    d.locator('[data-action="upgrade"]').click()
    check('Build queue created, level not instant',lambda:d.evaluate('HOG_APP_DEBUG.getState().buildingQueue?.key==="market"&&HOG_APP_DEBUG.getState().buildings.market===0'))
    check('Construction progress shown',lambda:d.locator('progress').count()==1)
    d.screenshot(path=str(evidence/'screenshot-construction-desktop.png'),full_page=True)
    d.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();HOG_ENGINE.tick(s,s.lastTick+s.buildingQueue.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()})()')
    check('Market completes after tick',lambda:d.evaluate('HOG_APP_DEBUG.getState().buildings.market===1'))
    d.locator('#sell-qty').fill('10')
    d.locator('[data-action="sell"]').click()
    check('Market sale transaction works',lambda:d.evaluate('HOG_APP_DEBUG.getState().log[0].includes("Bán 10")'))
    d.locator('#nav [data-tab="heroes"]').click()
    check('Tavern candidate cards visible',lambda:d.locator('[data-action="hirecandidate"]').count()==2)
    check('Tavern hero quality is calculated from candidate stats',lambda:d.evaluate('(()=>{const h=HOG_APP_DEBUG.getState().tavern.offers[0];return h.quality===HOG_ENGINE.heroNameColor(h)&&Number.isFinite(h.heroValue)})()'))
    old=d.evaluate('HOG_APP_DEBUG.getState().heroes.length')
    d.locator('[data-action="hirecandidate"]').first.click()
    check('Hire removes only selected candidate',lambda:d.evaluate('HOG_APP_DEBUG.getState().tavern.offers.length===1'))
    check('Hire adds hero to roster',lambda:d.evaluate('HOG_APP_DEBUG.getState().heroes.length')==old+1)
    d.locator('[data-action="castellan"]').last.click()
    check('Castellan can be appointed',lambda:d.evaluate('HOG_APP_DEBUG.getState().castellan!==null'))
    d.screenshot(path=str(evidence/'screenshot-tavern-desktop.png'),full_page=True)
    d.locator('#nav [data-tab="army"]').click()
    check('Tier-2 elf scout is locked before its Barracks tier',lambda:d.locator('[data-action="recruit"][data-id="elf_2"]').is_disabled())
    d.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();s.buildings.barracks=2;HOG_APP_DEBUG.render()})()')
    check('Tier-2 elf scout still requires Scouting after Barracks 2',lambda:d.locator('[data-action="recruit"][data-id="elf_2"]').is_disabled() and 'Trinh sát 0/1' in d.locator('#main').inner_text())
    d.screenshot(path=str(evidence/'screenshot-troop-unlocks-desktop.png'),full_page=True)
    d.locator('#q_elf_1').fill('4')
    d.locator('[data-action="recruit"][data-id="elf_1"]').click()
    check('Real troop training queue starts',lambda:d.evaluate('HOG_APP_DEBUG.getState().training[0]?.count===4'))
    d.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();HOG_ENGINE.tick(s,s.lastTick+s.training[0].remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()})()')
    check('Completed troop training awards Castellan XP and level',lambda:d.evaluate('(()=>{const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.id===2);return s.army.elf_1===20&&h.level===2&&h.statPoints===1})()'))
    d.locator('#nav [data-tab="magic"]').click()
    check('Bootcamp prerequisite is a real canonical Magic Tower spell action',lambda:d.locator('[data-action="learn"][data-id="bootcamp"]').is_enabled())
    d.locator('[data-action="learn"][data-id="bootcamp"]').click()
    check('Research starts without applying its level early',lambda:d.evaluate('HOG_APP_DEBUG.getState().researchQueue?.key==="bootcamp"&&(HOG_APP_DEBUG.getState().spells.bootcamp||0)===0'))
    d.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();HOG_ENGINE.tick(s,s.lastTick+s.researchQueue.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()})()')
    check('Research completes at its queue boundary',lambda:d.evaluate('HOG_APP_DEBUG.getState().spells.bootcamp===1&&HOG_APP_DEBUG.getState().researchQueue===null'))
    d.locator('#nav [data-tab="heroes"]').click()
    old_atk=d.evaluate('HOG_APP_DEBUG.getState().heroes.find(h=>h.id===2).atk')
    d.locator('[data-action="heropoint"][data-id="2"][data-stat="atk"]').click()
    check('Unspent hero attribute point changes combat stat',lambda:d.evaluate('(expected)=>{const h=HOG_APP_DEBUG.getState().heroes.find(x=>x.id===2);return h.atk===expected+1&&h.statPoints===0}',old_atk))
    d.screenshot(path=str(evidence/'screenshot-progression-desktop.png'),full_page=True)
    d.locator('#save').click()
    check('Save stored under v07 key',lambda:d.evaluate('!!localStorage.getItem("heoofgaia_hg_only_v07")'))
    store=d.evaluate('window.__qaStore')
    d2=launch({'width':1440,'height':900},store)
    check('Reload restores race, buildings, heroes and research',lambda:d2.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s?.race==="elf"&&s.buildings.market===1&&s.heroes.length===2&&s.army.elf_1===20&&s.spells.bootcamp===1&&!s.technologies&&s.heroes.find(h=>h.id===2).level===2&&s.heroes.find(h=>h.id===2).statPoints===0})()'))
    check('Reload retains selected Castellan',lambda:d2.evaluate('HOG_APP_DEBUG.getState().castellan===2'))
    with d2.expect_download(timeout=10000) as got:
        d2.locator('#export-save').click()
    download=got.value
    savefile=folder/'qa-export-temp.json'
    download.save_as(str(savefile))
    check('Browser exports valid JSON',lambda:json.loads(savefile.read_text(encoding='utf-8'))['state']['version']==7)
    d2.evaluate('HOG_APP_DEBUG.getState().res.gold=17;HOG_APP_DEBUG.render()')
    d2.on('dialog',lambda dialog:dialog.accept())
    d2.locator('#import-file').set_input_files(str(savefile))
    d2.wait_for_timeout(300)
    check('Browser import restores resources',lambda:d2.evaluate('HOG_APP_DEBUG.getState().res.gold>17'))
    check('Browser import restores Tavern roster',lambda:d2.evaluate('HOG_APP_DEBUG.getState().heroes.length===2'))
    savefile.unlink(missing_ok=True)
    d2.close()
    d.close()
    m=launch({'width':390,'height':844})
    check('Mobile intro readable',lambda:m.locator('[data-action="start"]').is_visible())
    m.locator('[data-action="start"]').click()
    check('Mobile world canvas visible',lambda:m.locator('#world-canvas').is_visible())
    m.screenshot(path=str(evidence/'screenshot-world-mobile.png'),full_page=True)
    m.locator('#nav [data-tab="heroes"]').click()
    check('Mobile Tavern displays candidate controls',lambda:m.locator('[data-action="hirecandidate"]').count()==2)
    m.screenshot(path=str(evidence/'screenshot-tavern-mobile.png'),full_page=True)
    m.locator('#nav [data-tab="city"]').click()
    check('Mobile city canvas visible',lambda:m.locator('#city-canvas').is_visible())
    m.locator('#nav [data-tab="army"]').click()
    check('7 formation slots render',lambda:m.locator('[id^="formation_count_"]').count()==7)
    check('40 troop cards show real prerequisite state',lambda:m.locator('[data-action="recruit"]').count()==10 and m.locator('.unitrow .tiny.muted').count()>=20)
    check('HG08 cap visible in army UI',lambda:'11.500' in m.locator('#main').inner_text())
    check('HG08 progression and capacity libraries active',lambda:m.evaluate('typeof HOG_ENGINE.heroLimit==="function"&&typeof HOG_ENGINE.grantHeroExperience==="function"'))
    check('No unhandled browser JS errors',lambda:not errors)
    m.close()
    browser.close()
passed=sum(ok for _,ok in checks);total=len(checks)
(evidence/'QA-RC1-RESULTS.json').write_text(json.dumps({'total':total,'passed':passed,'failed':total-passed,'errors':errors,'checks':[{'name':n,'passed':b} for n,b in checks]},indent=2,ensure_ascii=False),encoding='utf-8')
print(f'BROWSER TOTAL {passed}/{total} PASS; JS exceptions={len(errors)}')
sys.exit(1 if passed!=total else 0)
