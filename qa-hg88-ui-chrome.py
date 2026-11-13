"""HG88 real Chromium QA: tower reset, card summoning and world-map UX.
All seeded cards/high Tower levels are EXPLICIT QA-only fixtures, never
claimed as rewards earned by gameplay. Test PC/phone landscape, 4 races.
"""
from pathlib import Path
import json,atexit
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
OUT=ROOT/'docs/evidence/hg88';OUT.mkdir(parents=True,exist_ok=True)
REPORT=ROOT/'docs/qa/hg88/real-ui.json';REPORT.parent.mkdir(parents=True,exist_ok=True)
checks=[];images=[];errors=[]
def check(name,condition,details=None):
    good=bool(condition);checks.append({'name':name,'pass':good})
    print(('HG88 UI PASS ' if good else 'HG88 UI FAIL ')+name+' '+str(details or '')[:200],flush=True)
    if not good:raise AssertionError(name+' '+str(details))
def snap(page,name):
    file=OUT/(name+'.png');page.screenshot(path=str(file),animations='disabled')
    images.append(str(file.relative_to(ROOT)))
@atexit.register
def report():
    REPORT.write_text(json.dumps({'ok':all(x['pass'] for x in checks),'total':len(checks),
       'passed':sum(x['pass'] for x in checks),'errors':errors,'images':images},
       ensure_ascii=False,indent=2),encoding='utf8')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 for size,label in [({'width':1280,'height':720},'pc'),({'width':960,'height':540},'mobile')]:
  for race in ['human','elf','orc','undead']:
   page=browser.new_page(viewport=size,accept_downloads=True)
   page.on('pageerror',lambda e,label=label,race=race:errors.append(label+race+':'+str(e)))
   page.on('dialog',lambda dialog:dialog.accept())
   page.goto((ROOT/'Play-Heoofgaia-HG11.html').as_uri(),wait_until='load',timeout=180000)
   if race!='human':page.locator('[data-action="race"][data-race="'+race+'"]').click()
   page.locator('[data-action="start"]').click()
   # World map must be an interactive, textured surface at a real physical
   # viewport size. Preserve original existing render sprites and map state.
   map_state=page.evaluate("""() => {
    const c=document.querySelector('#world-canvas'),legend=document.querySelector('.hg88-world-legend');
    const r=c?.getBoundingClientRect(),m=HOG_PAINTER?.mapCamera?.();
    return {canvas:!!c,legend:!!legend,height:r?.height||0,width:r?.width||0,
      camera:!!m,save:HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState()),
      version:HOG_APP_DEBUG.getState().version};
   }""")
   check(label+' '+race+' world map renders with legend and valid v07',
     map_state['canvas'] and map_state['legend'] and map_state['height']>=220 and
     map_state['width']>300 and map_state['camera'] and map_state['save'] and
     map_state['version']==7,map_state)
   snap(page,label+'-'+race+'-world-map')
   # Manually seed a TEST scenario for actual UI Tower reset and card draw.
   page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState();
    s.fame=1000000;
    s.hg20.tower.floor=21;s.hg20.tower.hg88.highest=20;
    s.hg20.tower.hg88.resetsUsed=0;
    s.hg18.materials.resource_chest=500;
    s.hg18.materials.resource_card=100;
    HOG_APP_DEBUG.render();
   }""")
   page.locator('[data-action="tab"][data-tab="tower"]').first.click()
   reset_summary=page.evaluate("""() =>({
      floor:HOG_ENGINE.hg88TowerStatus(HOG_APP_DEBUG.getState()).floor,
      highest:HOG_ENGINE.hg88TowerStatus(HOG_APP_DEBUG.getState()).highest,
      button:!!document.querySelector('[data-action="hg88-tower-reset"]:not(:disabled)'),
      milestones:document.querySelectorAll('.hg88-milestone').length,
      label:document.querySelector('.hg88-tower-top')?.innerText
   })""")
   check(label+' '+race+' Tower 7 milestone cards and daily reset button',
      reset_summary['floor']==21 and reset_summary['highest']==20 and
      reset_summary['button'] and reset_summary['milestones']==7,reset_summary)
   snap(page,label+'-'+race+'-tower-before-reset')
   page.locator('[data-action="hg88-tower-reset"]').click()
   reset=page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState(),v=HOG_ENGINE.hg88TowerStatus(s);
    return {floor:v.floor,highest:v.highest,used:v.resetsUsed,
     valid:HOG_ENGINE.strictSave(s),cardCount:s.hg18.materials.resource_chest}
   }""")
   check(label+' '+race+' Tower reset preserves earned cards and high-water',
     reset['floor']==1 and reset['highest']==20 and reset['used']==1 and
     reset['cardCount']==500 and reset['valid'],reset)
   snap(page,label+'-'+race+'-tower-after-reset')
   page.locator('[data-action="tab"][data-tab="relics"]').first.click()
   card_ui=page.evaluate("""() => ({
     panels:document.querySelectorAll('.hg88-card-banner').length,
     fiveHundred:!!document.querySelector('[data-action="hg88-summon"][data-draws="500"]:not(:disabled)'),
     hundred:document.querySelectorAll('[data-action="hg88-summon"][data-draws="100"]:not(:disabled)').length,
     noResourceCard:!document.querySelector('.hg409-material-card .hg409-material-head b')?.textContent?.includes('Thẻ tài nguyên')
   })""")
   check(label+' '+race+' 100/200/500 special hero batch card UI active',
     card_ui['panels']==2 and card_ui['fiveHundred'] and card_ui['hundred']>=2 and card_ui['noResourceCard'],card_ui)
   snap(page,label+'-'+race+'-hero-cards-before')
   page.locator('[data-action="hg88-summon"][data-id="resource_chest"][data-draws="500"]').click()
   result=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(h=>h.cardSpecial);
      return {heroes:s.heroes.length,quality:h?.quality,tier:h?.cardTier,
       level:h?.level,drawn:s.hg88.totalDrawn,summons:s.hg88.summons,
       remain:s.hg18.materials.resource_chest,valid:HOG_ENGINE.strictSave(s),
       version:s.version,screen:document.querySelector('.hg408-screen')!==null}
   }""")
   check(label+' '+race+' 500 card draw grants ONE real Rainbow hero, no quest',
     result['heroes']==2 and result['quality']=='rainbow' and
     result['tier']==500 and result['level']==1 and result['drawn']==500 and
     result['summons']==1 and result['remain']==0 and result['valid'] and
     result['version']==7 and result['screen'],result)
   snap(page,label+'-'+race+'-summoned-hero-profile')
   page.evaluate('HOG_APP_DEBUG.save()')
   page.reload(wait_until='load',timeout=180000)
   cold=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();return {valid:HOG_ENGINE.strictSave(s),
       version:s.version,heroes:s.heroes.length,rainbow:s.heroes.some(h=>h.cardSpecial&&h.quality==='rainbow'),
       cards:s.hg18.materials.resource_chest,highest:s.hg20.tower.hg88.highest,
       floor:s.hg20.tower.floor,reset:s.hg20.tower.hg88.resetsUsed}
   }""")
   check(label+' '+race+' cold Save v07 protects reset, one hero and paid cards',
     cold['valid'] and cold['version']==7 and cold['heroes']==2 and
     cold['rainbow'] and cold['cards']==0 and cold['highest']==20 and
     cold['floor']==1 and cold['reset']==1,cold)
   page.close()
 browser.close()
check('No browser page errors',len(errors)==0,errors)
print('HG88 Chromium '+str(sum(x['pass'] for x in checks))+'/'+str(len(checks))+' PASS',flush=True)
