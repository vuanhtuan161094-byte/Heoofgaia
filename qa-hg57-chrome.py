"""HG57: real file:// three-viewport combat UX and correctly grouped battle-phase
presentation. No imported loot, no simulated victory and strict v07 preserved.
"""
from pathlib import Path
import atexit,hashlib,json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
FILE=ROOT/'Play-Heoofgaia-HG11.html'
OUT=ROOT/'docs/qa/hg57';SHOTS=ROOT/'docs/evidence/hg57'
OUT.mkdir(parents=True,exist_ok=True);SHOTS.mkdir(parents=True,exist_ok=True)
checks=[];shots=[];errors=[]
def check(label,condition,detail=None):
 checks.append({'name':label,'pass':bool(condition),'detail':detail})
 print(('HG57 CHROME PASS ' if condition else 'HG57 CHROME FAIL ')+label+' '+str(detail)[:320],flush=True)
 if not condition:raise AssertionError(label+' '+str(detail)[:850])
def shot(page,label):
 p=SHOTS/(label+'.png');page.screenshot(path=str(p),animations='disabled')
 shots.append({'file':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
def report():
 (OUT/'chromium-combat.json').write_text(json.dumps({'passed':sum(x['pass'] for x in checks),
  'total':len(checks),'checks':checks,'shots':shots,'errors':errors},ensure_ascii=False,indent=2),encoding='utf8')
atexit.register(report)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 for label,w,h,touch in [('desktop-1280x720',1280,720,False),('phone-844x390',844,390,True),('phone-412x915',412,915,True)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=touch,has_touch=touch)
  page=ctx.new_page();page.set_default_timeout(12000)
  page.on('pageerror',lambda err,label=label:errors.append({'viewport':label,'error':str(err)}))
  page.goto(FILE.as_uri(),wait_until='load',timeout=90000)
  page.locator('[data-action="start"]').click()
  # A visual fixture uses the actual canonical game engine to create the
  # existing world Boss encounter. No reward, AP, XP or army grant is issued.
  x=page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
   const res={...s.res},rewards=s.hg409.rewards.length;
   s.battle=E.makeBattle(s,'18,92');s.battle.autoUntil=Date.now()+180000;
   HOG_APP_DEBUG.showCombatForTests();
   const leaders=document.querySelector('[data-hg57-leaders]');
   return {strict:E.strictSave(s),version:s.version,
     names:[...leaders.querySelectorAll('.hg57-hero-description>b')].map(e=>e.textContent),
     friend:leaders.querySelectorAll('[data-hg57-friendly] .hg57-hero-chip').length,
     enemy:leaders.querySelectorAll('[data-hg57-enemy] .hg57-hero-chip').length,
     actualHero:s.heroes.find(h=>h.id===s.activeHero).name,
     resourcesUnchanged:E.C.keys.every(k=>res[k]===s.res[k]),
     rewardsUnchanged:rewards===s.hg409.rewards.length,
     hpButton:!!document.querySelector('[data-action="battle-hp"]'),
     nameButton:!!document.querySelector('[data-action="battle-labels"]'),
     board:document.getElementById('battle-canvas').getBoundingClientRect().toJSON(),
     labelCount:document.querySelectorAll('[data-hg57-leaders]').length,
     movement:document.getElementById('hg57-move-steps')?.textContent};
  }""")
  check(label+' actual two-sided commander portrait cards remain visible',x['strict'] and
   x['version']==7 and x['friend']>=1 and x['enemy']==1 and x['actualHero'] in x['names'] and
   x['labelCount']==1 and x['board']['width']>140 and x['hpButton'] and x['nameButton'],x)
  check(label+' unit movement budget is visible; visual fixture pays no phantom reward',
   'ô/lượt' in x['movement'] and x['resourcesUnchanged'] and x['rewardsUnchanged'],x['movement'])
  check(label+' hero chips and global resource HUD are not obscured',
   page.evaluate("""() => {
     const a=document.querySelector('.hg57-commander-strip').getBoundingClientRect(),
     h=document.querySelector('#app>.top').getBoundingClientRect();
     return a.top>=h.bottom+10 && a.width>150 &&
       document.querySelectorAll('#resources button.resource').length===5;
   }"""))
  shot(page,label+'-two-commander-combat')
  before=page.locator('[data-action="battle-labels"]').get_attribute('aria-pressed')
  page.locator('[data-action="battle-labels"]').click()
  after=page.locator('[data-action="battle-labels"]').get_attribute('aria-pressed')
  check(label+' name visibility toggles without hiding health',
   before=='true' and after=='false' and
   page.locator('[data-action="battle-hp"]').get_attribute('aria-pressed')=='true')
  page.locator('[data-action="battle-hp"]').click()
  check(label+' health independently toggles off, names can be restored',
   page.locator('[data-action="battle-hp"]').get_attribute('aria-pressed')=='false')
  page.locator('[data-action="battle-labels"]').click()
  check(label+' names toggle restores on without mutating strict v07',
   page.locator('[data-action="battle-labels"]').get_attribute('aria-pressed')=='true' and
   page.evaluate('() => HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())'))
  # Recorder must preserve distinct friendly/enemy phase and never overlap
  # actor animation intervals. This shares the game JS function, not a model.
  schedule=page.evaluate("""() => {
    const e=[{actorId:'p0',order:'attack',path:[],damage:10},
      {actorId:'p1',order:'move',path:[{x:2,y:4}],damage:0},
      {actorId:'e0',order:'attack',path:[],damage:10}];
    const s=HOG_PAINTER.battleVisualSchedule(e);
    return {duration:s.duration,slots:s.steps,
      noOverlap:s.steps.every((x,i)=>i===0||x.start>=s.steps[i-1].animationEnd),
      sideBreak:s.steps[2].start-s.steps[1].animationEnd};
  }""")
  check(label+' sequenced visible A-A-B actor phases not simultaneous',
    schedule['noOverlap'] and schedule['sideBreak']>=250 and
    schedule['duration']>schedule['slots'][-1]['animationEnd'],schedule)
  check(label+' no JavaScript errors',not [x for x in errors if x['viewport']==label],errors)
  ctx.close()
 browser.close()
print('HG57 CHROMIUM '+str(sum(x['pass'] for x in checks))+'/'+str(len(checks)),flush=True)
