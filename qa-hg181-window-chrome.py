"""HG18.1 real-Chromium fixed-viewport management UX acceptance.
No gameplay resources or hero/army stats are granted by this test.
"""
from pathlib import Path
import json
import os
import sys
from playwright.sync_api import sync_playwright
if hasattr(sys.stdout,"reconfigure"):
 sys.stdout.reconfigure(encoding="utf-8")
ROOT=Path(__file__).parent
OUT=Path(os.environ.get('HOG_HG181_EVIDENCE_ROOT',ROOT/'docs'/'evidence'/'hg181'))
REPORT=Path(os.environ.get('HOG_HG181_REPORT',ROOT/'docs'/'qa'/'hg181'/'window-chrome.json'))
OUT.mkdir(parents=True,exist_ok=True);REPORT.parent.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(name,condition,details=None):
  ok=bool(condition);checks.append({"name":name,"pass":ok,"details":details})
  print(("PASS " if ok else "FAIL ")+name+' '+str(details or ''),flush=True)
  if not ok:raise AssertionError(name)
try:
 with sync_playwright() as pw:
  launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']}
  chrome=os.environ.get('HOG_CHROME_PATH')
  if chrome: launch['executable_path']=chrome
  browser=pw.chromium.launch(**launch)
  page=browser.new_page(viewport={'width':1280,'height':720})
  page.set_default_timeout(8000)
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
  # HG28 keeps optional command systems collapsed so the real troop roster is visible first.
  # Open the actual control before asserting its selected hero and editable formation.
  page.locator('.hg28-army-ops:not(.hg28-army-quest) > summary').click()
  check('Private hero-based allocation panel opens from the real Army command drawer',
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
  page.wait_for_function("""() => {
    const s=HOG_APP_DEBUG.getState(),saved=JSON.parse(localStorage.getItem(HOG_ENGINE.SAVE_KEY)||'null');
    return s.hg20.tower.team.length===1&&s.hg20.tower.team[0]===1&&
      s.hg20.tower.picks.length===1&&s.hg20.tower.picks[0].slots.length>=1&&
      HOG_ENGINE.strictSave(s)&&saved?.hg20?.tower?.team?.[0]===1&&
      saved?.hg20?.tower?.picks?.[0]?.slots?.length>=1;
  }""")
  check('Tower team selection stores owned slots atomically in strict Save v07',
    page.locator('[data-action="tower-climb"]').is_enabled() and
    page.evaluate("HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())"))
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
  # HG41 legitimately fields TEN real enemy stacks at floor 1. Sixteen free
  # starter spears now lose: no fake victory, reward, soldier or Save mutation.
  unpaid=page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState(),t=s.hg20.tower;
    return {battle:!!s.battle,floor:t.floor,claims:t.claims,
      outcome:t.last?.outcome,turns:t.last?.turns,
      garrison:s.army.human_1,valid:HOG_ENGINE.strictSave(s)};
  }""")
  check('Unfunded 16-soldier Tower defeat grants zero claims and preserves real army',
    not unpaid['battle'] and unpaid['floor']==1 and unpaid['claims']==0 and
    unpaid['outcome']=='lose' and unpaid['turns']>=1 and
    unpaid['garrison']==16 and unpaid['valid'],unpaid)
  # A real gameplay upgrade, not a QA troop grant: pay for another 45 Spear
  # Militia from the Army screen, let the paid training queue finish via tick,
  # then assign the actually owned 61 troops using the visible formation button.
  page.locator('[data-action="tab"][data-tab="army"]').first.click()
  before_paid=page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState();
    return {gold:s.res.gold,garrison:s.army.human_1,claims:s.hg20.tower.claims};
  }""")
  page.locator('.game-window-body #q_human_1').fill('45')
  page.locator('.game-window-body [data-action="recruit"][data-id="human_1"]').click()
  paid=page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState(),q=s.training.find(t=>t.unitId==='human_1');
    return {gold:s.res.gold,queue:q?.count,remaining:q?.remaining,
      valid:HOG_ENGINE.strictSave(s)};
  }""")
  check('Actual Recruit button charges gold and queues exactly 45 additional soldiers',
    paid['gold']<before_paid['gold'] and paid['queue']==45 and paid['remaining']>0 and paid['valid'],paid)
  delivered=page.evaluate("""() => {
    const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),q=s.training.find(t=>t.unitId==='human_1');
    E.tick(s,s.lastTick+(q.remaining+2)*1000/s.speed);HOG_APP_DEBUG.render();
    return {garrison:s.army.human_1,remaining:s.training.length,valid:E.strictSave(s)};
  }""")
  check('Paid recruitment completes exactly once with 61 genuine garrison soldiers',
    delivered['garrison']==61 and delivered['remaining']==0 and delivered['valid'],delivered)
  drawer=page.locator('.hg28-army-ops:not(.hg28-army-quest)')
  if not drawer.evaluate('e=>e.open'):drawer.locator('summary').click()
  page.locator('.game-window-body [data-action="autoformation"]').click()
  check('Real Auto Formation assigns only the 61 paid-and-owned soldiers',
    page.evaluate("""() => {
      const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),p=E.hg20HeroPlan(s,1);
      return p.length===1&&p[0].unitId==='human_1'&&p[0].count===61&&
        s.army.human_1===61&&E.strictSave(s);
    }"""))
  page.locator('[data-action="tab"][data-tab="tower"]').first.click()
  check('Tower is still on floor 1 with exactly zero rewards before the funded attempt',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();
      return s.hg20.tower.floor===1&&s.hg20.tower.claims===0&&
        HOG_ENGINE.strictSave(s);
    }"""))
  page.locator('[data-action="tower-climb"]').click()
  check('The funded Tower attempt fields the same real enemy army without nerfing CS',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),b=s.battle;
      return b?.kind==='tower'&&b.hg410?.enemyStacks===10&&
        b.hg409EnemyCommander?.cs===1&&
        b.allies.reduce((n,u)=>n+u.count,0)===61&&HOG_ENGINE.strictSave(s);
    }"""))
  for turn in range(70):
    if not page.evaluate("!!HOG_APP_DEBUG.getState().battle"):break
    page.locator('[data-action="battle"][data-cmd="attack"]').click()
  funded=page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState(),t=s.hg20.tower;
    return {battle:!!s.battle,floor:t.floor,claims:t.claims,outcome:t.last?.outcome,
      turns:t.last?.turns,garrison:s.army.human_1,save:HOG_ENGINE.strictSave(s)};
  }""")
  check('Funded real 61-soldier tactical victory pays exactly one of five daily claims',
    not funded['battle'] and funded['floor']==2 and funded['claims']==1 and
    funded['outcome']=='win' and funded['turns']>=1 and
    funded['garrison']==61 and funded['save'],funded)
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
  # Stop disables automation but intentionally leaves the real outbound march
  # alone. Use the actual reset flow to isolate the next roster scenario,
  # rather than mutating the plan of a hero still on that legitimate march.
  page.on('dialog',lambda dialog:dialog.accept())
  tools=page.locator('.hg42-screen-tool-menu')
  check('Chơi lại remains reachable inside the visible HG42 management tools menu',tools.count()==1)
  if not tools.evaluate('e=>e.open'):tools.locator('summary').click()
  check('Chơi lại becomes visible after opening the actual tools menu',tools.locator('#reset').is_visible())
  tools.locator('#reset').click()
  page.locator('[data-action="start"]').click()
  check('Fresh New Game begins at 60x speed',
    page.evaluate("HOG_APP_DEBUG.getState().speed===60"))
  # The world map relocates control buttons into its visible HG39 dock.
  page.locator('#speed').click()
  check('Real speed control sets the fresh joint-roster scenario to 1x',
    page.evaluate("HOG_APP_DEBUG.getState().speed===1"))
  check('HG26 outbound state is isolated before the fresh joint-roster scenario',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();
      return !!s&&!s.march&&!s.expedition&&!s.battle&&HOG_ENGINE.strictSave(s);
    }"""))
  # HG26.1: fixture creates two extra legal hero records so the same real
  # command window can be checked at 3 x 2 without Tavern wait or QA gifts.
  page.evaluate("""() => {
    const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),u=s.race+'_1';
    const source=JSON.parse(JSON.stringify(s.heroes[0]));
    for(let i=2;i<=3;i++)s.heroes.push({...source,id:i,name:'QA Joint Hero '+i});
    E.hg20SetHeroPlan(s,1,[{unitId:u,count:2},{unitId:u,count:2}]);
    E.hg20SetHeroPlan(s,2,[{unitId:u,count:2},{unitId:u,count:2}]);
    E.hg20SetHeroPlan(s,3,[{unitId:u,count:2},{unitId:u,count:2}]);
    HOG_APP_DEBUG.render();
  }""")
  # Reset/New Game returns to the map; the joint Boss roster is on Army.
  page.locator('[data-action="tab"][data-tab="army"]').first.click()
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
  page.locator('#save').click()
  check('HG26.1 real Save button accepts the outbound six-stack v07 state',
    page.evaluate("""() => {
      const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),raw=localStorage.getItem(E.SAVE_KEY);
      const parsed=raw&&E.parseSave(raw);
      return !!parsed&&E.strictSave(s)&&parsed.expedition?.formation.length===6&&parsed.hg26.joint.team.length===3;
    }"""))
  page.reload(wait_until='load')
  check('Cold reload preserves HG26.1 outbound owners, six stacks and strict Save',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),a=s.expedition?.formation||[];
      return !!s.march&&s.march.phase==='outbound'&&a.length===6&&
        new Set(a.map(g=>g.hg261HeroId)).size===3&&HOG_ENGINE.strictSave(s);
    }"""))
  # The Army modal relocates the very same #speed into the HG42 tools fold.
  # Open that real visible menu; never force-click the hidden legacy node.
  tools=page.locator('.hg42-screen-tool-menu')
  if tools.count() and not tools.evaluate('e=>e.open'):tools.locator('summary').click()
  page.locator('#speed').click()
  check('The real speed control returns the outbound march to 60x for bounded browser QA',
    page.evaluate("HOG_APP_DEBUG.getState().speed===60"))
  boss=page.evaluate("""() => {
    const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
    const wallEta=Math.ceil((s.march.remaining+1)/s.speed);
    E.tick(s,s.lastTick+Math.ceil((s.march.remaining+1)/s.speed*1000));
    const opened=E.hg26Step(s);
    const strict=HOG_ENGINE.strictSave(s),joint=s.battle?.hg261Joint;
    E.hg26Stop(s,'QA: giữ nguyên trận Boss để kiểm tra Save/Reload thủ công');
    HOG_APP_DEBUG.render();
    return {opened:opened.type,battle:!!s.battle,joint:joint?.team||[],
      stacks:s.battle?.allies.length||0,strict,wallEta,reportCount:s.battleReports.length};
  }""")
  check('HG26.1 actual route arrival opens one tactical Boss fight with six owner-tagged stacks',
    boss['opened']=='battle_open' and boss['battle'] and len(boss['joint'])==3 and
    boss['stacks']==6 and boss['strict'] and boss['reportCount']==0,boss)
  page.locator('.scene-tools [data-action="save-combat"]').click()
  check('Player Save button persists the live joint Boss encounter before resolution',
    page.evaluate("""() => {
      const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),raw=localStorage.getItem(E.SAVE_KEY);
      const parsed=raw&&E.parseSave(raw);
      return !!parsed?.battle?.hg261Joint&&parsed.battle.allies.length===6&&
        parsed.battleReports.length===0&&E.strictSave(s);
    }"""))
  page.wait_for_timeout(3000)
  viewports=[(960,540),(1280,720),(1366,768),(1600,900),(1920,1080),(1818,830)]
  for width,height in viewports:
    page.set_viewport_size({'width':width,'height':height})
    page.wait_for_timeout(120)
    geometry=page.evaluate("""({width,height}) => {
      const rect=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r&&{top:r.top,bottom:r.bottom,left:r.left,right:r.right}};
      const title=rect('.scene-title>div:first-child'),tools=rect('.scene-tools');
      const canvas=rect('#battle-canvas'),commands=rect('.battle-command-dock'),
        dock=document.querySelector('.battle-command-dock'),stage=rect('.battle-stage'),
        actions=[...document.querySelectorAll('.battle-command-dock .battle-action-grid button')];
      const separated=!!title&&!!tools&&(title.right<=tools.left+1||title.bottom<=tools.top+1||tools.bottom<=title.top+1);
      return {w:innerWidth,h:innerHeight,scrollW:document.scrollingElement.scrollWidth,
        scrollH:document.scrollingElement.scrollHeight,canvas,commands,stage,separated,
        dockOpen:!!dock?.open,actionsLive:actions.some(b=>b.dataset.cmd==='attack'&&b.getClientRects().length)&&
          actions.some(b=>b.dataset.action==='auto'&&b.getClientRects().length),
        sideBySide:!!canvas&&!!commands&&commands.left>=canvas.right-1};
    }""",{'width':width,'height':height})
    page.screenshot(path=str(OUT/f'joint-boss-combat-{width}x{height}.png'))
    valid=(geometry['w']==width and geometry['h']==height and geometry['scrollW']<=width+2 and
      geometry['canvas'] is not None and geometry['commands'] is not None and
      geometry['canvas']['top']>=0 and geometry['canvas']['bottom']<=height and
      geometry['commands']['top']>=0 and geometry['commands']['bottom']<=height and geometry['separated'] and
      geometry['dockOpen'] and geometry['actionsLive'] and geometry['sideBySide'])
    check(f'{width}x{height} joint Boss canvas, controls and title geometry',valid,geometry)
  page.set_viewport_size({'width':960,'height':540})
  page.reload(wait_until='load')
  check('Cold reload during joint Boss combat restores all three owners and Save v07',
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),b=s.battle;
      return !!b?.hg261Joint&&b.hg261Joint.team.length===3&&b.allies.length===6&&
        s.expedition?.formation.length===6&&s.battleReports.length===0&&HOG_ENGINE.strictSave(s);
    }"""))


  check('No uncaught runtime exceptions during modal switching',not errors,errors)
  browser.close()
finally:
  receipt={'kind':'HG18.1 fixed-stage real Chromium UI','checks':checks,
  'passed':sum(c['pass'] for c in checks),'failed':sum(not c['pass'] for c in checks),
  'errors':errors,'screens':[str((OUT/name).relative_to(ROOT).as_posix()) for name in ['world-fixed-1280x720.png','army-seven-stacks-window.png','world-fixed-960x540.png','private-tower-real-command.png','private-tower-six-stack-battle.png','joint-boss-combat-960x540.png','joint-boss-combat-1280x720.png','joint-boss-combat-1366x768.png','joint-boss-combat-1600x900.png','joint-boss-combat-1920x1080.png','joint-boss-combat-1818x830.png']]}
  REPORT.write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
