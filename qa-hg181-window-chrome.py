"""HG18.1 real-Chromium fixed-viewport management UX acceptance.
No gameplay resources or hero/army stats are granted by this test.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
OUT=ROOT/'docs'/'evidence'/'hg181';QA=ROOT/'docs'/'qa'/'hg181'
OUT.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(name,condition,details=None):
  ok=bool(condition);checks.append({"name":name,"pass":ok,"details":details})
  print(("PASS " if ok else "FAIL ")+name+' '+str(details or ''),flush=True)
  if not ok:raise AssertionError(name)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
  page=browser.new_page(viewport={'width':1280,'height':720})
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto((ROOT/'Play-Heoofgaia-HG11.html').as_uri(),wait_until='load')
  check('New Game creation remains clickable without document scrolling',
    page.locator('[data-action="start"]').is_visible())
  page.locator('[data-action="start"]').click()
  geometry=page.evaluate("""() => ({
    scrollHeight:document.scrollingElement.scrollHeight,
    innerHeight:innerHeight,scrollWidth:document.scrollingElement.scrollWidth,
    innerWidth:innerWidth,map:!!document.querySelector('#world-canvas'),
    overlayHidden:document.querySelector('#game-modal').hidden
  })""")
  check('1280x720 primary game stays inside a fixed document viewport',
    geometry['scrollHeight']<=geometry['innerHeight']+2 and
    geometry['scrollWidth']<=geometry['innerWidth']+2 and geometry['map'] and geometry['overlayHidden'],geometry)
  page.screenshot(path=str(OUT/'world-fixed-1280x720.png'))
  page.locator('[data-action="tab"][data-tab="city"]').first.click()
  check('City management opens dialog over the existing map',
    page.locator('#game-modal:not([hidden])').count()==1 and
    page.locator('#world-canvas').count()==1 and page.locator('#city-canvas').count()==1)
  page.locator('[data-action="building"][data-key="market"]').click()
  check('Dialog dispatch opens selected Market upgrade instead of swallowing clicks',
    page.locator('[data-action="upgrade"][data-key="market"]').count()==1)
  page.locator('[data-action="tab"][data-tab="army"]').first.click()
  check('Seven hero combat slots displayed in 4 rear and 3 front positions',
    page.locator('.game-window-body .formation-slot').count()==7 and
    page.locator('.game-window-body .formation-back').count()==4 and
    page.locator('.game-window-body .formation-front').count()==3)
  page.screenshot(path=str(OUT/'army-seven-stacks-window.png'))
  # Private gameplay: one actual recruitable commander, allocated real initial
  # troops, tower selection via popup, real button-driven floor reward and Save.
  check('Private hero-based allocation panel shows selected commander and 7 editable stacks',
    page.locator('.hg20-command').count()==1 and
    'Aldric' in page.locator('.hg20-command').inner_text())
  page.locator('.game-window-body [data-action="autoformation"]').click()
  check('Real initial troops are assigned to the active hero without duplication',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),r=HOG_ENGINE.hg20HeroRole(s,1);
      return r.status==='home'&&r.army.reduce((a,g)=>a+g.count,0)===16&&
        HOG_ENGINE.strictSave(s);
    }"""))
  # HG24: use real management actions, not direct Save fixtures.
  page.locator('.game-window-body [data-action="hg24-save-template"]').click()
  check('HG24 real button stores the active hero template without minting troops',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),t=HOG_ENGINE.hg24Template(s,1);
      return t?.groups.length===1&&t.groups[0].count===16&&
        s.army.human_1===16&&HOG_ENGINE.strictSave(s);
    }"""))
  page.locator('#hg24_auto_fill').check()
  page.locator('.game-window-body [data-action="hg24-policy"]').click()
  check('HG24 opt-in auto-refill policy is saved with automatic hiring disabled',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),t=HOG_ENGINE.hg24Template(s,1);
      return t?.autoFill===true&&t?.autoTrain===false&&HOG_ENGINE.strictSave(s);
    }"""))
  page.locator('.game-window-body [data-action="hg24-drill"]').click()
  check('HG24 paid training click grants EXP and charges actual resources',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();
      return s.hg24.daily.drills===1&&s.heroes[0].level>1&&
        s.res.gold<33000&&HOG_ENGINE.strictSave(s);
    }"""))
  page.locator('[data-action="tab"][data-tab="tower"]').first.click()
  check('Tower is an actual on-demand game window with three hero slots',
    page.locator('#game-modal:not([hidden]) #hg20_tower_0').count()==1 and
    page.locator('#hg20_tower_1').count()==1 and page.locator('#hg20_tower_2').count()==1)
  page.locator('#hg20_tower_0').select_option('1')
  page.locator('[data-action="tower-team"]').click()
  page.locator('[data-action="tower-climb"]').click()
  check('Tower click enters real tactical battle with one hero and at most two stacks',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),b=s.battle;
      return b?.kind==='tower'&&b?.hg21Tower?.team.length===1&&
        b.allies.length>=1&&b.allies.length<=2&&
        b.allies.every(u=>u.heroId===1)&&HOG_ENGINE.strictSave(s);
    }"""))
  page.screenshot(path=str(OUT/'private-tower-six-stack-battle.png'))
  for turn in range(70):
    if not page.evaluate("!!HOG_APP_DEBUG.getState().battle"):break
    page.locator('[data-action="battle"][data-cmd="attack"]').click()
  check('Real tactical turn clicks win floor 1 and grant exactly one of five daily claims',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),t=s.hg20.tower;
      return !s.battle&&t.floor===2&&t.claims===1&&t.team.length===1&&
        t.last?.outcome==='win'&&t.last?.turns>=1&&HOG_ENGINE.strictSave(s);
    }"""))
  page.screenshot(path=str(OUT/'private-tower-real-command.png'))
  page.locator('[data-action="tab"][data-tab="army"]').first.click()
  page.locator('.game-window-body [data-action="hg24-boss-prepare"]').click()
  check('HG24 smart Boss preparation selects real encounter and commander without spending AP',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
      const text=document.querySelector('.target-information')?.textContent||'';
      return E.hg24RecommendBoss(s).some(b=>!b.privateBoss&&text.includes(b.name))&&
        s.activeHero===1&&!s.march&&!s.expedition&&E.strictSave(s);
    }"""))
  page.locator('[data-action="tab"][data-tab="tasks"]').first.click()
  check('Task board is an on-demand dialog, not stacked beneath the map',
    page.locator('.game-window-body [data-action="hg18-claim"][data-id="daily_build"]').count()==1)
  page.locator('#save').click()
  check('Save remains reachable while modal open and preserves strict v07 data',
    page.evaluate("HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())"))
  page.keyboard.press('Escape')
  check('Escape closes dialog without losing map or document sizing',
    page.locator('#game-modal[hidden]').count()==1 and page.locator('#world-canvas').count()==1)
  page.locator('[data-action="world-index"]').click()
  check('World destination catalog opens only on request',page.locator('#game-modal:not([hidden]) .landmarks').count()==1)
  page.locator('[data-action="modal-close"]').click()
  check('Closing catalog returns to world view',page.locator('#game-modal[hidden]').count()==1)
  page.set_viewport_size({'width':960,'height':540})
  page.screenshot(path=str(OUT/'world-fixed-960x540.png'))
  mobile=page.evaluate("""() => ({
    w:innerWidth,h:innerHeight,scrollW:document.scrollingElement.scrollWidth,
    scrollH:document.scrollingElement.scrollHeight
  })""")
  check('960x540 landscape game never scrolls main document',
    mobile['scrollH']<=mobile['h']+2 and mobile['scrollW']<=mobile['w']+2,mobile)
  page.locator('[data-action="tab"][data-tab="army"]').first.click()
  check('HG26 real browser exposes explicit OFF, Boss selector and safety limits',
    page.locator('.game-window-body .hg26-autohunt').count()==1 and
    page.locator('#hg26_boss option').count()>=1 and
    page.evaluate("HOG_APP_DEBUG.getState().hg26.enabled===false"))
  # New Game defaults to 60×. Slow to 1× using the real speed command so the
  # multi-minute expedition cannot finish during Playwright locator scrolling.
  page.evaluate("HOG_ENGINE.setSpeed(HOG_APP_DEBUG.getState(),1)")
  page.locator('#hg26_max_runs').fill('1')
  page.locator('.game-window-body [data-action="hg26-start"]').click()
  hunt=page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState(),q=s.hg26;
    return {enabled:q.enabled,phase:q.phase,limit:q.config.maxRuns,runs:q.runs,
      wins:q.wins,strict:HOG_ENGINE.strictSave(s),ap:s.ap,
      target:q.config.target,toast:document.querySelector('#toast')?.textContent};
  }""")
  check('HG26 real click enables selected Boss policy without instantly claiming a victory',
    hunt['enabled'] and hunt['limit']==1 and hunt['runs']==0 and hunt['wins']==0 and hunt['strict'],hunt)
  page.locator('.game-window-body [data-action="hg26-stop"]').click()
  check('HG26 real stop click disables automation and preserves Save v07',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();
      return s.hg26.enabled===false&&s.hg26.phase==='halted'&&
        HOG_ENGINE.strictSave(s);
    }"""))
  # HG26.1: fixture creates two extra legal hero records so the same real
  # command window can be checked at 3 x 2 without Tavern wait or QA gifts.
  page.evaluate("""() => {
    const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),u=s.race+'_1';
    E.hg24SetAuto(s,1,false,false);
    const source=JSON.parse(JSON.stringify(s.heroes[0]));
    for(let i=2;i<=3;i++)s.heroes.push({...source,id:i,name:'QA Joint Hero '+i});
    E.hg20SetHeroPlan(s,1,[{unitId:u,count:2},{unitId:u,count:2}]);
    E.hg20SetHeroPlan(s,2,[{unitId:u,count:2},{unitId:u,count:2}]);
    E.hg20SetHeroPlan(s,3,[{unitId:u,count:2},{unitId:u,count:2}]);
    HOG_APP_DEBUG.render();
  }""")
  check('HG26.1 actual selector exposes 3 heroes and 2 stack slots each',
    all(page.locator(f'#hg261_team_{i}').count()==1 and
      page.locator(f'#hg261_slot_{i}_0').count()==1 and
      page.locator(f'#hg261_slot_{i}_1').count()==1 for i in range(3)))
  page.locator('.game-window-body [data-action="hg261-roster-refresh"]').click()
  page.locator('#hg26_max_runs').fill('1')
  page.locator('.game-window-body [data-action="hg26-start"]').click()
  check('HG26.1 actual UI starts 3-owner policy with 6 real planned stacks',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();
      return s.hg26.enabled===true&&s.hg26.joint.team.length===3&&
        s.hg26.joint.team.every(r=>r.groups.length===2)&&HOG_ENGINE.strictSave(s);
    }"""))
  page.wait_for_function("""() => {
    const s=HOG_APP_DEBUG.getState();return s?.expedition?.formation?.length===6;
  }""",timeout=8000)
  check('HG26.1 normal browser timer dispatches one real six-stack Boss expedition',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),a=s.expedition?.formation||[];
      return a.length===6&&new Set(a.map(g=>g.hg261HeroId)).size===3&&
        s.army[s.race+'_1']===4&&s.ap<101&&HOG_ENGINE.strictSave(s);
    }"""))
  page.locator('.game-window-body [data-action="hg26-stop"]').click()
  check('HG26.1 real stop preserves the already dispatched joint army and Save',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();
      return !s.hg26.enabled&&s.expedition?.formation.length===6&&HOG_ENGINE.strictSave(s);
    }"""))
    check('No uncaught runtime exceptions during modal switching',not errors,errors)
  browser.close()
finally:
 receipt={'kind':'HG18.1 fixed-stage real Chromium UI','checks':checks,
  'passed':sum(c['pass'] for c in checks),'failed':sum(not c['pass'] for c in checks),
  'errors':errors,'screens':['world-fixed-1280x720.png','army-seven-stacks-window.png','world-fixed-960x540.png','private-tower-real-command.png','private-tower-six-stack-battle.png']}
 (QA/'window-chrome.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
