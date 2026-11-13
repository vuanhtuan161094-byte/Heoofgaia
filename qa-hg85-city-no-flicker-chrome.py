"""HG85: real building-click and construction DOM continuity at PC/phone sizes.
The SAME canvas must survive selection, paid upgrade and completion. Save v07
and the canonical engine own all building resources/queues: no synthetic levels.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
OUT=ROOT/'docs'/'evidence'/'hg85'
REPORT=ROOT/'docs'/'qa'/'hg85'/'city-no-flicker.json'
OUT.mkdir(parents=True,exist_ok=True)
REPORT.parent.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];images=[]
def check(label,value,extra=None):
 passed=bool(value)
 checks.append({'name':label,'pass':passed,'details':extra})
 print(('HG85 PASS ' if passed else 'HG85 FAIL ')+label+(' '+str(extra)[:300] if extra else ''),flush=True)
 if not passed:raise AssertionError(label)
def screenshot(page,name):
 file=OUT/name;page.screenshot(path=str(file),animations='disabled')
 images.append(str(file.relative_to(ROOT)))
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 for size,label in [({'width':1280,'height':720},'pc'),({'width':960,'height':540},'phone-landscape')]:
  page=browser.new_page(viewport=size)
  page.on('pageerror',lambda err:errors.append(str(err)))
  page.goto((ROOT/'Play-Heoofgaia-HG11.html').as_uri(),wait_until='load')
  page.locator('[data-action="start"]').click()
  page.locator('[data-action="tab"][data-tab="city"]').first.click()
  check(label+' initial city and Save v07',page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState();return s.version===7&&HOG_ENGINE.strictSave(s)&&
    !!document.querySelector('#city-canvas')&&
    !!document.querySelector('.hg28-city-command');
  }"""))
  page.evaluate("""() => {
   window.__hg85Stage=document.querySelector('.hg28-city-screen');
   window.__hg85Canvas=document.querySelector('#city-canvas');
   window.__hg85Body=document.querySelector('#game-modal-body');
   window.__hg85Main=document.querySelector('#main');
   window.__hg85Spend=[];
   const orig=HOG_ENGINE.spend;
   window.__hg85Unhook=()=>HOG_ENGINE.spend=orig;
   HOG_ENGINE.spend=function(s,c){
    const gold=s.res.gold,result=orig(s,c);
    window.__hg85Spend.push({goldSpent:gold-s.res.gold,expectedGold:c.gold});
    return result;
   };
  }""")
  screenshot(page,'01-'+label+'-city-before.png')
  # Both selection and upgrade use actual clickable DOM buttons.
  page.locator('.hg28-building-grid [data-action="building"][data-key="market"]').first.click()
  check(label+' selection preserves original canvas and city stage',page.evaluate("""() =>
   document.querySelector('#city-canvas')===window.__hg85Canvas &&
   document.querySelector('.hg28-city-screen')===window.__hg85Stage &&
   document.querySelector('#game-modal-body')===window.__hg85Body &&
   document.querySelector('.hg28-selected-building h2').textContent==='Market'"""))
  screenshot(page,'02-'+label+'-market-selected.png')
  check(label+' real Market upgrade is payable',page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState(),cost=HOG_ENGINE.buildCost(s,'market');
   return HOG_ENGINE.canAfford(s,cost)&&!s.buildingQueue&&s.buildings.market===0;
  }"""))
  page.locator('[data-action="upgrade"][data-key="market"]').first.click()
  after=page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState();
   return {sameCanvas:document.querySelector('#city-canvas')===window.__hg85Canvas,
    sameStage:document.querySelector('.hg28-city-screen')===window.__hg85Stage,
    sameModal:document.querySelector('#game-modal-body')===window.__hg85Body,
    queue:s.buildingQueue?.key,markets:s.buildings.market,
    payments:window.__hg85Spend.slice(),save:HOG_ENGINE.strictSave(s),
    progress:!!document.querySelector('.queue-card progress')};
  }""")
  check(label+' paid upgrade keeps unchanged canvas, no full-screen repaint',after['sameCanvas'] and
    after['sameStage'] and after['sameModal'] and after['queue']=='market' and
    after['markets']==0 and after['save'] and after['progress'] and len(after['payments'])==1 and
    after['payments'][0]['goldSpent']==after['payments'][0]['expectedGold'],after)
  screenshot(page,'03-'+label+'-upgrade-queued.png')
  # Speed 60 is the New Game default. This is a genuine construction timer.
  page.wait_for_function("""() => {
   const s=HOG_APP_DEBUG.getState();
   return s.buildingQueue===null&&s.buildings.market===1;
  }""",timeout=20000)
  completed=page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState();
   return {canvas:document.querySelector('#city-canvas')===window.__hg85Canvas,
    stage:document.querySelector('.hg28-city-screen')===window.__hg85Stage,
    market:s.buildings.market,save:HOG_ENGINE.strictSave(s),
    queueMissing:!document.querySelector('.queue-card'),
    marketEnabled:!!document.querySelector('#city-market-service')};
  }""")
  check(label+' real upgrade completion preserves canvas and marketplace UI',
    completed['canvas'] and completed['stage'] and completed['market']==1 and
    completed['save'] and completed['queueMissing'] and completed['marketEnabled'],completed)
  screenshot(page,'04-'+label+'-upgrade-finished.png')
  page.evaluate('window.__hg85Unhook()')
  page.reload(wait_until='load')
  check(label+' cold reload keeps paid Market Lv1',page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState();
   return s.buildings.market===1&&s.version===7&&HOG_ENGINE.strictSave(s);
  }"""))
  page.close()
 browser.close()
check('No unhandled browser errors',len(errors)==0,errors)
REPORT.write_text(json.dumps({'pass':all(x['pass'] for x in checks),'checks':checks,
 'screenshots':images,'errors':errors},ensure_ascii=False,indent=2),encoding='utf8')
print('HG85 UI '+str(sum(x['pass'] for x in checks))+'/'+str(len(checks))+' PASS',flush=True)
