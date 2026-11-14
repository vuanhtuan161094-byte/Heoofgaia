"""HG89 real Chromium QA: paid mythic summon and two-hero world NPC battle.
Fixtures seed only cards/army/Fame to reach the UI; all user actions use
the actual HTML and canonical Save v07, not an alternate demo scene.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,atexit
ROOT=Path(__file__).parent
OUT=ROOT/'docs/evidence/hg89';OUT.mkdir(parents=True,exist_ok=True)
REPORT=ROOT/'docs/qa/hg89/real-ui.json';REPORT.parent.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];shots=[]
def ok(label,payload):
    v=bool(payload);checks.append({'label':label,'pass':v})
    print(('HG89 UI PASS ' if v else 'HG89 UI FAIL ')+label,flush=True)
    if not v:raise AssertionError(label)
def snap(p,label):
    fn=OUT/(label+'.png');p.screenshot(path=str(fn),animations='disabled')
    shots.append(str(fn.relative_to(ROOT)))
@atexit.register
def finish():
    REPORT.write_text(json.dumps({'passes':sum(x['pass'] for x in checks),'total':len(checks),
      'checks':checks,'errors':errors,'shots':shots},ensure_ascii=False,indent=2))
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 for dim,screen in [({'width':1280,'height':720},'desktop'),({'width':960,'height':540},'mobile')]:
  for race in ['human','elf','orc','undead']:
   p=b.new_page(viewport=dim)
   p.on('pageerror',lambda e,screen=screen,race=race:errors.append(screen+race+': '+str(e)))
   p.on('dialog',lambda dlg:dlg.accept())
   p.goto((ROOT/'Play-Heoofgaia-HG11.html').as_uri(),wait_until='load',timeout=180000)
   if race!='human':p.locator('[data-action="race"][data-race="'+race+'"]').click()
   p.locator('[data-action="start"]').click()
   p.evaluate("""() => {
     const s=HOG_APP_DEBUG.getState();
     s.fame=1000000; s.hg18.materials.resource_chest=100;
     s.army[s.race+'_1']=100;HOG_APP_DEBUG.render();
   }""")
   p.locator('[data-action="tab"][data-tab="relics"]').first.click()
   stat=p.evaluate("""() => ({
      name:document.querySelector('.hg89-pantheon header h2')?.textContent,
      gods:document.querySelectorAll('.hg89-deity').length,
      fragments:HOG_ENGINE.hg89Status(HOG_APP_DEBUG.getState()).fragments,
      can:!!document.querySelector('[data-action="hg89-awaken"][data-id="yang_jian"]:not(:disabled)'),
      noRandom:!document.querySelector('[data-action="hg88-summon"][data-id="resource_chest"]')
   })""")
   ok(screen+' '+race+' six real myth recipes and no instant divine hero',stat['gods']==6 and stat['fragments']==100 and stat['can'] and stat['noRandom'])
   snap(p,screen+'-'+race+'-pantheon')
   p.locator('[data-action="hg89-awaken"][data-id="yang_jian"]').click()
   result=p.evaluate("""() => {
     const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.mythicId==='yang_jian');
     return {name:h?.name,rarity:h?.quality,heroes:s.heroes.length,
       fragments:s.hg18.materials.resource_chest,save:HOG_ENGINE.strictSave(s),
       city:h?.cityId===s.activeCityId,skill:!!HOG_ENGINE.hg89Status(s).deities.find(x=>x.id==='yang_jian')};
   }""")
   ok(screen+' '+race+' paid 100 fragments yields Yang Jian in actual city',
      result['name']=='Dương Tiễn' and result['rarity']=='rainbow' and
      result['heroes']==2 and result['fragments']==0 and result['save'] and result['city'] and result['skill'])
   snap(p,screen+'-'+race+'-yang-jian')
   p.evaluate("""() => {
      const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),unit=s.race+'_1';
      E.hg20SetHeroPlan(s,1,[{unitId:unit,count:30}]);
      E.hg20SetHeroPlan(s,2,[{unitId:unit,count:30}]);
      HOG_APP_DEBUG.render();
   }""")
   p.locator('[data-action="tab"][data-tab="map"]').first.click()
   p.locator('[data-action="findnpc"]').first.click()
   p.locator('.hg89-raid-panel > summary').click()
   ready=p.evaluate("""() => {
      const checked=[...document.querySelectorAll('input[data-hg89-raid-hero]:checked')].map(x=>x.dataset.hg89RaidHero);
      return {checked,button:!!document.querySelector('[data-action="hg89-raid"]:not(:disabled)'),
        groups:document.querySelectorAll('.hg89-raid-hero').length};
   }""")
   ok(screen+' '+race+' joint NPC field panel has two selected real commanders',
      len(ready['checked'])==2 and ready['button'] and ready['groups']==2)
   snap(p,screen+'-'+race+'-joint-raid-before')
   p.locator('[data-action="hg89-raid"]').click()
   sent=p.evaluate("""() => {
     const s=HOG_APP_DEBUG.getState();
     return {exp:!!s.expedition,stack:s.expedition?.formation?.length||0,
       owners:s.expedition?.formation?.map(g=>g.hg261HeroId)||[],
       stock:s.army[s.race+'_1'],enabled:s.hg26.enabled,
       manual:s.hg26.joint?.manual,save:HOG_ENGINE.strictSave(s),ap:s.ap};
   }""")
   ok(screen+' '+race+' 2 heroes/2 stacks marched to same monster with paid army',
      sent['exp'] and sent['stack']==2 and sent['owners']==[1,2] and
      sent['stock']==40 and sent['manual'] and not sent['enabled'] and sent['save'] and sent['ap']<150)
   snap(p,screen+'-'+race+'-joint-raid-marching')
   p.evaluate('HOG_APP_DEBUG.save()')
   p.reload(wait_until='load',timeout=180000)
   cold=p.evaluate("""() => {
     const s=HOG_APP_DEBUG.getState();
     return {version:s.version,valid:HOG_ENGINE.strictSave(s),hero:s.heroes.some(h=>h.mythicId==='yang_jian'),
       formation:s.expedition?.formation?.map(g=>g.hg261HeroId)||[],fragments:s.hg18.materials.resource_chest};
   }""")
   ok(screen+' '+race+' cold Save v07 keeps paid god and co-op expedition',
      cold['version']==7 and cold['valid'] and cold['hero'] and cold['formation']==[1,2] and cold['fragments']==0)
   fighting=p.evaluate("""() => {
      const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),sec=s.march?.remaining||0;
      E.tick(s,s.lastTick+Math.ceil((sec+1)/s.speed*1000));
      return {battle:!!s.battle,kind:s.battle?.kind,owners:s.battle?.allies?.map(u=>u.heroId)||[],
       joint:s.battle?.hg261Joint?.team||[],valid:E.strictSave(s)};
   }""")
   ok(screen+' '+race+' both owners fight ONE authentic tactical NPC battle',
      fighting['battle'] and fighting['kind']=='npc' and fighting['owners']==[1,2] and
      fighting['joint']==[1,2] and fighting['valid'])
   p.close()
 b.close()
ok('No JS runtime errors',not errors)
print('HG89 Chromium '+str(sum(x['pass'] for x in checks))+'/'+str(len(checks))+' PASS',flush=True)
