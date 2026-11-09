"""HG44-B/C browser gate for real New Game progress HUD and map-first UX.
Mid/late screen variants use isolated deep-cloned read-only state projections,
NOT game rewards, profile edits or a second Save.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json,hashlib
ROOT=Path(__file__).resolve().parent
GAME=ROOT/'Play-Heoofgaia-HG11.html'
QA=ROOT/'docs/qa/hg44';SHOTS=ROOT/'docs/evidence/hg44'
QA.mkdir(parents=True,exist_ok=True);SHOTS.mkdir(parents=True,exist_ok=True)
checks=[];pictures=[];errors=[]
def check(name,condition,detail=None):
 ok=bool(condition);checks.append({'name':name,'pass':ok,'detail':detail})
 print(('HG44 PASS ' if ok else 'HG44 FAIL ')+name,flush=True)
 if not ok:raise AssertionError(name+': '+repr(detail)[:400])
def capture(page,label):
 filename=SHOTS/(label+'.png');page.screenshot(path=str(filename),animations='disabled')
 pictures.append({'viewport':label,'path':str(filename.relative_to(ROOT)),
  'sha256':hashlib.sha256(filename.read_bytes()).hexdigest()})
with sync_playwright() as pw:
 options={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']}
 if os.environ.get('HOG_CHROME_PATH'):options['executable_path']=os.environ['HOG_CHROME_PATH']
 browser=pw.chromium.launch(**options)
 for label,w,h,mobile in [
  ('pc-1280x720',1280,720,False),('phone-844x390',844,390,True),
  ('phone-768x260',768,260,True),('phone-412x915',412,915,True)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1)
  page=ctx.new_page();page.set_default_timeout(15000)
  page.on('pageerror',lambda err,label=label:errors.append({'viewport':label,'error':str(err)}))
  page.goto(GAME.as_uri(),wait_until='load',timeout=65000)
  page.locator('[data-action="start"]').click()
  guide=page.locator('.hg44-journey')
  check(label+' New Game has true early-phase journey',guide.count()==1 and
   guide.get_attribute('data-hg44-phase')=='0')
  drawer=page.locator('.hg39-map-details').filter(has=guide)
  if drawer.count() and not drawer.first.evaluate('(d)=>d.open'):
   drawer.first.locator('summary').click()
  check(label+' compact journey next step stays accessible on the map',
   guide.is_visible() and guide.locator('.hg44-journey-next button[data-action="tab"]').count()==1)
  before=page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
   return {res:{...s.res},training:s.training.length,cities:s.cities.length,
    version:s.version,valid:E.strictSave(s),battle:!!s.battle};
  }""")
  check(label+' real world canvas remains present in map view',
   page.locator('#world-canvas').count()==1 and
   page.evaluate("""() => {
    const c=document.querySelector('#world-canvas'),b=c.getBoundingClientRect();
    return b.width>85&&b.height>30;
   }"""))
  # All three guides render from separately cloned states; the real live game
  # stays untouched. This is a projection test, not fake quest completion.
  projection=page.evaluate("""() => {
   const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),D=HOG_APP_DEBUG;
   const before=JSON.stringify(s),fresh=D.hg44JourneyView(s);
   const middle=JSON.parse(before);
   middle.cities.push({...middle.cities[0],id:'qa-only-city-2'});
   middle.hg30={...middle.hg30,stage:1,npcWins:2,paidTowerWins:1,bossWins:1};
   const mid=D.hg44JourneyView(middle);
   const late=JSON.parse(before);
   late.cities.push({...late.cities[0],id:'qa-only-city-2'});
   late.hg30={...late.hg30,stage:2,npcWins:3,paidTowerWins:2,bossWins:3};
   late.hg20.tower.floor=11;
   const end=D.hg44JourneyView(late);
   return {unchanged:before===JSON.stringify(s),valid:E.strictSave(s),
    phases:[fresh.includes('data-hg44-phase="0"'),mid.includes('data-hg44-phase="1"'),
      end.includes('data-hg44-phase="2"')],
    actions:[fresh,mid,end].map(x=>(x.match(/data-action="tab"/g)||[]).length),
    realCounters:mid.includes('NPC 2')&&mid.includes('Boss 1')&&end.includes('Tháp 11'),
    noFakeReward:[fresh,mid,end].every(x=>!x.includes('data-action="claim-qa"'))};
  }""")
  check(label+' 3 actual-stage templates have 6 real action routes, no save mutation',
   projection['unchanged'] and projection['valid'] and
   all(projection['phases']) and all(x==7 for x in projection['actions']) and
   projection['realCounters'] and projection['noFakeReward'],projection)
  # Only one compact next action is visible. The six options are revealed
  # by the player, without covering the actual map permanently.
  detail=guide.locator('.hg44-journey-details')
  detail.locator('summary').click()
  check(label+' expandable real six-step roadmap is available',
   detail.locator('.hg44-journey-all [data-action="tab"]').count()==6)
  detail.locator('summary').click()
  capture(page,label+'-progress-map')
  guide.locator('.hg44-journey-next [data-action="tab"]').click()
  check(label+' next step opens ORIGINAL city management, not a mockup',
   page.locator('.hg28-tab-city').count()==1 and page.locator('#game-modal').is_visible())
  after=page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
   return {res:{...s.res},training:s.training.length,cities:s.cities.length,
    version:s.version,valid:E.strictSave(s),battle:!!s.battle};
  }""")
  check(label+' roadmap navigation creates no resources, troops, combat or extra cities',
   before==after,{'before':before,'after':after})
  check(label+' no uncaught JS runtime errors',not any(err['viewport']==label for err in errors),errors)
  ctx.close()
 browser.close()
result={'suite':'HG44-B/C organic navigation and pure progression projection',
 'passed':sum(t['pass'] for t in checks),'total':len(checks),
 'checks':checks,'screenshots':pictures,'errors':errors}
(QA/'journey-map-four-viewports.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('HG44 JOURNEY CHROMIUM '+str(result['passed'])+'/'+str(result['total']),flush=True)
