"""HG42 real Chromium acceptance: Boss screen separation, real map/dispatch,
dense 16-stack Canvas, mobile target list, zero JavaScript errors."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib,json,os
ROOT=Path(__file__).resolve().parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
EVIDENCE=ROOT/'docs/evidence/hg42'; QA=ROOT/'docs/qa/hg42'
EVIDENCE.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
results=[];captures=[];errors=[]
def check(label,ok,data=None):
 ok=bool(ok)
 results.append({'label':label,'pass':ok,'data':data})
 print(('HG42 PASS ' if ok else 'HG42 FAIL ')+label,flush=True)
 if not ok: raise AssertionError(label+' '+str(data)[:300])
def shot(page,name):
 path=EVIDENCE/(name+'.png');page.screenshot(path=str(path),animations='disabled')
 captures.append({'path':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
with sync_playwright() as pw:
 launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']}
 if os.environ.get('HOG_CHROME_PATH'):launch['executable_path']=os.environ['HOG_CHROME_PATH']
 browser=pw.chromium.launch(**launch)
 for label,w,h,mobile in [
  ('pc-1280x720',1280,720,False),
  ('phone-844x390',844,390,True),
  ('phone-768x260',768,260,True),
  ('phone-412x915',412,915,True)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1)
  page=ctx.new_page();page.set_default_timeout(14000)
  page.on('pageerror',lambda e,label=label:errors.append({'viewport':label,'error':str(e)}))
  page.goto(HTML.as_uri(),wait_until='load',timeout=60000)
  page.locator('[data-action="start"]').click()
  check(label+' new game has strict Save v07',page.evaluate("() => HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())"))
  # Distinct full-screen management screens, not floating panels over the
  # world map. Every original action is still on its canonical route.
  for route in ['city','army','heroes','magic','relics','tasks','tower','reports','sources']:
   page.locator('#nav [data-action="tab"][data-tab="'+route+'"]').click()
   frame=page.evaluate("""() => {
    const m=document.querySelector('#game-modal'),w=m?.querySelector('.game-window');
    if(!w)return null;
    const r=w.getBoundingClientRect();
    return {separate:document.body.classList.contains('hg42-management-screen-open'),
     modal:!m.hidden,left:r.left,right:r.right,top:r.top,bottom:r.bottom,
     viewportWidth:innerWidth,viewportHeight:innerHeight};
   }""")
   check(label+' standalone '+route+' screen fits without overlapping viewport',
    bool(frame) and frame['separate'] and frame['modal'] and
    frame['left']>=-1 and frame['right']<=w+2 and
    frame['top']>=0 and frame['bottom']<=h+2,frame)
   check(label+' original Save stays clickable on '+route,
    page.locator('#save').is_visible() and page.locator('.hg42-screen-tool-menu summary').count()==1)
   if route=='city':
    page.locator('.hg42-screen-tool-menu summary').click()
    check(label+' original export/import tools accessible in screen menu',
     page.locator('#export-save').is_visible() and page.locator('#import-save').is_visible())
    page.locator('.hg42-screen-tool-menu summary').click()
   if route in ('heroes','army'):shot(page,label+'-screen-'+route)
  page.locator('#nav [data-action="tab"][data-tab="map"]').click()
  page.locator('#nav [data-action="tab"][data-tab="boss"]').click()
  check(label+' dedicated Boss page opens',page.locator('.hg42-boss-page[data-hg42-boss-screen="targets"]').count()==1)
  check(label+' separate tabs have three routes',page.locator('.hg42-boss-subnav [data-action="hg42-boss-screen"]').count()==3)
  bounds=page.evaluate("""() => {
   const r=document.querySelector('.hg42-boss-page').getBoundingClientRect();
   return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,viewport:innerWidth,height:innerHeight};
  }""")
  check(label+' Boss screen frame fits viewport',bounds['left']>=-1 and bounds['right']<=w+2 and bounds['bottom']<=h+2 and bounds['height']>0 if 'height' in bounds else bounds['top']>=0,bounds)
  page.locator('[data-action="hg42-boss-tier"][data-tier="13"]').click()
  check(label+' Boss T13 selected and command CS10 visible',page.locator('.hg42-boss-target').count()>0 and
    'CS10' in page.locator('.hg42-boss-target').first.inner_text())
  shot(page,label+'-boss-targets')
  page.locator('[data-action="hg42-boss-screen"][data-id="loot"]').click()
  check(label+' rewards are dedicated screen with 3 actual tiers',
    page.locator('.hg42-boss-page[data-hg42-boss-screen="loot"]').count()==1 and page.locator('.hg42-reward-tier').count()==3)
  check(label+' high-tier loot shows usable item cards',page.locator('.hg42-reward-item').count()>=5)
  shot(page,label+'-boss-loot')
  page.locator('[data-action="hg42-boss-screen"][data-id="hunt"]').click()
  check(label+' real HG26 3-hero auto hunt exists on separate screen',
    page.locator('.hg42-boss-page[data-hg42-boss-screen="hunt"] .hg26-autohunt').count()==1 and
    page.locator('#hg26_boss').count()==1)
  shot(page,label+'-boss-hunt')
  page.locator('[data-action="hg42-boss-screen"][data-id="targets"]').click()
  page.locator('.hg42-boss-target [data-action="hg42-boss-locate"]').first.click()
  check(label+' locate goes to live world map not fake Boss mockup',
    page.evaluate("() => !HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState()) ? false : document.querySelector('#game-modal').hidden && !!document.querySelector('#world-canvas')"))
  page.locator('#nav [data-action="tab"][data-tab="boss"]').click()
  page.locator('.hg42-boss-target [data-action="hg42-boss-dispatch"]').first.click()
  check(label+' dispatch opens canonical per-hero troop slots',page.locator('.hg39-dispatch').count()==1)
  page.locator('[data-action="dispatch-close"]').first.click()
  check(label+' no game loot or invalid save from opening Boss screens',
    page.evaluate("() => HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState()) && HOG_APP_DEBUG.getState().hg409.rewards.length===0"))
  battle=page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,P=HOG_PAINTER;
   const t=E.TILES.find(x=>x.kind==='npc'&&x.eliteTier===13);
   s.battle=E.makeBattle(s,t.key);s.battle.autoUntil=Date.now()+3600000;
   HOG_APP_DEBUG.showCombatForTests();
   const c=document.querySelector('#battle-canvas'),cam=P.battleProjection(c,E),
    entries=P.battleUnitLayout(s.battle,cam,c.width,c.height,performance.now());
   return {stacks:s.battle.enemies.length,labels:entries.filter(x=>x.u.side==='enemy'&&x.label).length,
    footHits:entries.filter(x=>x.u.side==='enemy').every(x=>{const p=cam.center(x.u.x,x.u.y);
      return P.battleHit(c,p.x,p.y,E,s,performance.now())?.id===x.id}),
    valid:E.strictSave(s)};
  }""")
  check(label+' T13 battle has 16 individually targetable stacks and zero redundant labels',
    battle['stacks']==16 and battle['labels']==0 and battle['footHits'] and battle['valid'],battle)
  check(label+' 16-stack Boss has dedicated target list',page.locator('.hg42-boss-roster [data-action="hg42-boss-focus"]').count()==16)
  shot(page,label+'-boss-16-stack')
  page.locator('.hg42-boss-roster summary').click()
  page.locator('.hg42-boss-roster [data-action="hg42-boss-focus"][data-id="e10"]').click()
  focus=page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,P=HOG_PAINTER,c=document.querySelector('#battle-canvas'),
    cam=P.battleProjection(c,E),entries=P.battleUnitLayout(s.battle,cam,c.width,c.height,performance.now());
   return {id:s.battle.focused,labels:entries.filter(x=>x.u.side==='enemy'&&x.label).map(x=>x.u.id),valid:E.strictSave(s)};
  }""")
  check(label+' selecting target e10 shows exactly its full label, Save valid',
    focus['id']=='e10' and focus['labels']==['e10'] and focus['valid'],focus)
  shot(page,label+'-boss-focused-stack')
  check(label+' browser page errors absent',not any(e['viewport']==label for e in errors),errors)
  ctx.close()
 browser.close()
(QA/'chromium-boss-screen-and-paint.json').write_text(json.dumps({
 'screens':'targets/hunt/loot','checks':results,'screenshots':captures,'errors':errors
},ensure_ascii=False,indent=2),encoding='utf-8')
print('HG42 CHROMIUM '+str(sum(x['pass'] for x in results))+'/'+str(len(results)),flush=True)
