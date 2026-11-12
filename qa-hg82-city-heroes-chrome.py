"""HG82: real offline Chromium interactions for veteran dismissal,
two independently garrisoned cities and transactional troop dispatch.
QA fixtures use real canonical engine objects; never embedded in game.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, hashlib, os, sys, atexit
ROOT=Path(__file__).resolve().parent;HTML=ROOT/'Play-Heoofgaia-HG11.html'
OUT=ROOT/'docs/qa/hg82';ART=ROOT/'docs/evidence/hg82'
OUT.mkdir(parents=True,exist_ok=True);ART.mkdir(parents=True,exist_ok=True)
checks=[];shots=[];errors=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8',errors='replace')
def check(name,ok,value=None):
    checks.append({'name':name,'pass':bool(ok),'value':value})
    print(('HG82 CHROME PASS ' if ok else 'HG82 CHROME FAIL ')+name+' '+str(value)[:360],flush=True)
    if not ok:raise AssertionError(name+' '+str(value)[:600])
def capture(page,name):
    loc=ART/(name+'.png');page.screenshot(path=str(loc),animations='disabled')
    shots.append({'name':name,'sha256':hashlib.sha256(loc.read_bytes()).hexdigest()})
@atexit.register
def report():
    (OUT/'city-heroes-chromium.json').write_text(json.dumps({'passed':sum(q['pass'] for q in checks),'total':len(checks),
      'checks':checks,'screenshots':shots,'errors':errors,
      'file_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest() if HTML.exists() else None,
      'device_note':'Real Chromium; Android sizes use touch emulation, not physical Android'},
      ensure_ascii=False,indent=2),encoding='utf-8')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    for label,width,height,mobile in [('windows-1280x720',1280,720,False),('android-844x390',844,390,True),('android-412x915',412,915,True)]:
        context=browser.new_context(viewport={'width':width,'height':height},is_mobile=mobile,has_touch=mobile,
                                    device_scale_factor=2 if mobile else 1,accept_downloads=True)
        page=context.new_page();page.set_default_timeout(17000)
        page.on('pageerror',lambda e,lab=label:errors.append({'viewport':lab,'error':str(e)}))
        page.goto(HTML.as_uri(),wait_until='load',timeout=120000)
        page.locator('[data-action="start"]').click()
        page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
        check(label+' final hero cannot be dismissed by accident',
              page.locator('[data-action="hg82-quick-dismiss"]').first.is_disabled())
        fixture=page.evaluate("""() => {
           const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
           const veteran=JSON.parse(JSON.stringify(s.heroes[0]));veteran.id=2;
           veteran.name='Lão tướng HG82';veteran.cityId='main';
           s.heroes.push(veteran);s.equipment[2]={};E.hg81Ensure(s);
           const gear=E.addItem(s,'star_blade','HG82 real browser fixture');
           E.equipItem(s,gear.uid,2);
           const camp=E.TILES.find(t=>t.kind==='npc');
           s.battleReports.unshift({id:'battle-999',outcome:'win',target:camp.key,
             name:'Chiến báo cũ còn lưu',kind:'npc',turns:1,
             completedAt:s.lastTick,homeCityId:'main',heroId:2,heroName:veteran.name,heroXp:60,
             fame:0,resources:Object.fromEntries(E.C.keys.map(k=>[k,0])),items:[],
             allies:[],enemies:[],disposition:'home'});
           s.dailyTaskState.heroTask.active={heroId:2,stars:1,ready:false};
           HOG_APP_DEBUG.render();
           return {save:E.strictSave(s),gear:gear.uid,count:s.inventory.length,
             army:JSON.stringify(s.army),reportHero:s.battleReports[0].heroId};
        }""")
        check(label+' real veteran gear UID, old battle report and ongoing hero task are valid',
              fixture['save'] and fixture['reportHero']==2,fixture)
        page.locator('[data-action="hg408-inspect"][data-id="2"]').click()
        check(label+' veteran one-confirmation dismiss is visible and actionable',
              page.locator('[data-action="hg82-quick-dismiss"]').count()==1 and
              not page.locator('[data-action="hg82-quick-dismiss"]').is_disabled())
        page.once('dialog',lambda dlg:dlg.accept())
        page.locator('[data-action="hg82-quick-dismiss"]').click()
        retired=page.evaluate("""() => {
           const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
           return {heroes:s.heroes.map(h=>h.id),heroId:s.battleReports[0].heroId,
             retiredName:s.battleReports[0].retiredHeroName,reportId:s.battleReports[0].id,
             quest:s.dailyTaskState.heroTask.active,inventory:s.inventory.length,
             uid:s.inventory[0]?.uid,army:JSON.stringify(s.army),valid:E.strictSave(s)};
        }""")
        check(label+' veteran actually dismissed; battle history kept, quest cancelled and no gear/army loss',
              retired['valid'] and retired['heroes']==[1] and retired['heroId'] is None and
              retired['reportId']=='battle-999' and retired['inventory']==fixture['count'] and
              retired['uid']==fixture['gear'] and retired['army']==fixture['army'] and
              retired['quest'] is None,retired)
        capture(page,label+'-veteran-retired')
        cities=page.evaluate("""() => {
           const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
           s.fame=5800;const c=JSON.parse(JSON.stringify(E.make('elf',s.lastTick).cities[0]));
           c.id='city-elf-qa';c.name='Thành Elf kiểm thử';c.key='9,10';c.main=false;
           s.cities.push(c);if(s.aiCities[c.key])delete s.aiCities[c.key];
           HOG_APP_DEBUG.render();
           return {valid:E.strictSave(s),two:s.cities.length,heroOwner:E.hg82HeroCity(s,1)};
        }""")
        check(label+' two real independent garrisons added with strict v07',cities['valid'] and cities['two']==2,cities)
        page.locator('[data-action="tab"][data-tab="city"]').first.click()
        page.locator('[data-action="city-switch"][data-id="city-elf-qa"]').first.click()
        page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
        check(label+' empty secondary city does NOT show the main city hero',
              page.locator('.hg82-empty-city').count()==1 and
              page.locator('.hg408-roster-card').count()==0)
        page.evaluate("""() => {
          const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();s.res.gold=E.limits(s).gold;
          HOG_APP_DEBUG.render();
        }""")
        page.locator('.hg82-empty-city [data-action="hirecandidate"]').first.click()
        hired=page.evaluate("""() => {
          const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
          const h=s.heroes.find(h=>h.id!==1);
          return {cityId:h?.cityId,heroId:h?.id,city:s.activeCityId,
            local:E.hg82CityHeroes(s).map(h=>h.id),valid:E.strictSave(s)};
        }""")
        check(label+' Tavern button hires into secondary city ONLY',
              hired['valid'] and hired['cityId']=='city-elf-qa' and hired['local']==[hired['heroId']],hired)
        page.locator('[data-action="tab"][data-tab="city"]').first.click()
        page.locator('[data-action="city-switch"][data-id="main"]').first.click()
        page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
        main=page.evaluate("""() => {
          const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
          return {city:s.activeCityId,roster:E.hg82CityHeroes(s).map(h=>h.id),selected:s.activeHero,valid:E.strictSave(s)};
        }""")
        check(label+' returning to MAIN shows only its original hero, no cross-city commander',
              main['city']=='main' and main['roster']==[1] and main['selected']==1 and main['valid'],main)
        page.locator('[data-action="tab"][data-tab="city"]').first.click()
        page.locator('[data-action="city-switch"][data-id="city-elf-qa"]').first.click()
        page.locator('[data-action="tab"][data-tab="map"]').first.click()
        page.locator('[data-action="findnpc"]').first.click()
        page.locator('[data-action="dispatch-open"]').first.click()
        cards=page.evaluate("""() => {
          const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
          return {home:s.activeCityId,local:E.hg82CityHeroes(s).map(h=>h.id),
            rawHeroCards:[...document.querySelectorAll('[data-action="dispatch-select-hero"]')].map(e=>Number(e.dataset.id)),
            availableUnits:s.army.elf_1,valid:E.strictSave(s)};
        }""")
        check(label+' dispatch modal lists ONLY heroes stationed at current city',
              cards['rawHeroCards']==cards['local'] and cards['local']==[hired['heroId']] and cards['valid'],cards)
        page.locator('[data-action="dispatch-auto"]').click()
        check(label+' MAX has actual unit controls',page.locator('[data-action="dispatch-max"]').count()>=1)
        page.locator('[data-action="dispatch-adjust"][data-delta="-10"]').first.click()
        page.locator('[data-action="dispatch-max"]').first.click()
        preview=page.evaluate("""() => {
          const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
          return {army:s.army.elf_1,plan:E.hg20HeroPlan(s,s.heroes.find(h=>h.cityId==='city-elf-qa').id).length,
              valid:E.strictSave(s)};
        }""")
        check(label+' MAX preview changes UI draft but DOES NOT consume stock or silently reserve',
              preview['valid'] and preview['plan']==0 and preview['army']==cards['availableUnits'],preview)
        page.locator('[data-action="dispatch-save"]').click()
        page.locator('[data-action="dispatch-confirm"]').click()
        dispatched=page.evaluate("""() => {
          const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),h=s.heroes.find(h=>h.cityId==='city-elf-qa');
          return {hero:s.expedition?.heroId,expected:h?.id,home:s.expedition?.homeCityId,
                  army:s.expedition?.army||{},currentCity:s.activeCityId,valid:E.strictSave(s)};
        }""")
        check(label+' actual paid dispatch belongs to secondary city and keeps Save v07',
              dispatched['valid'] and dispatched['hero']==dispatched['expected'] and
              dispatched['home']=='city-elf-qa' and
              sum(dispatched['army'].values())>0,dispatched)
        capture(page,label+'-elf-dispatched')
        context.close()
    browser.close()
check('zero uncaught JS page errors',not errors,errors)
print('HG82 CHROME SUMMARY',sum(t['pass'] for t in checks),'/',len(checks),flush=True)
