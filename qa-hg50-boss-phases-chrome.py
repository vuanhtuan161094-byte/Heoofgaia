"""HG50-B physical Chromium binary gate for real Boss turn receipts and persisted v07 phases.
This uses explicit strong-army QA fixtures, not a claimed organic player progression.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,atexit,hashlib,sys
ROOT=Path(__file__).resolve().parent;HTML=ROOT/'Play-Heoofgaia-HG11.html'
OUT=ROOT/'docs/qa/hg50';OUT.mkdir(parents=True,exist_ok=True)
PICS=ROOT/'docs/evidence/hg50';PICS.mkdir(parents=True,exist_ok=True)
CHECKS=[];SHOTS=[];ERRORS=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8',errors='replace')
def check(name,valid,detail=None):
 CHECKS.append({'name':name,'pass':bool(valid),'detail':detail})
 print(('HG50-B CHROME PASS ' if valid else 'HG50-B CHROME FAIL ')+name,flush=True)
 if not valid:raise AssertionError(name+': '+str(detail)[:500])
def persist():
 (OUT/'phase-chromium.json').write_text(json.dumps({'gate':'HG50-B exact offline file Chromium combat phased receipts','passed':sum(q['pass'] for q in CHECKS),'total':len(CHECKS),'checks':CHECKS,'screenshots':SHOTS,'errors':ERRORS},indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
atexit.register(persist)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 for name,width,height,touch in [('desktop-1280x720',1280,720,False),('phone-844x390',844,390,True),('phone-768x260',768,260,True)]:
  ctx=browser.new_context(viewport={'width':width,'height':height},is_mobile=touch,has_touch=touch)
  page=ctx.new_page();page.on('pageerror',lambda e,v=name:ERRORS.append({'viewport':v,'error':str(e)}))
  page.goto(HTML.as_uri(),wait_until='load',timeout=90000)
  page.locator('[data-action="race"][data-race="human"]').click()
  page.locator('[data-action="start"]').click()
  for tier,prior,pct,phase in [(11,[],65,'active'),(12,[11],50,'active'),(13,[11,12],35,'warning')]:
   page.evaluate("() => HOG_APP_DEBUG.resetForTests()")
   result=page.evaluate("""({tier,prior,phase})=>{
    const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
    s.hg50.completed=prior;s.hg50.unlocked=prior.length+1;
    const h=s.heroes[0];h.level=100;h.atk=tier===11?240000:400000;h.def=h.atk;h.spd=tier===11?100:120;
    const count=tier===11?500:800;s.army.human_10=count;s.ap=900;
    E.hg20SetHeroPlan(s,1,[{unitId:'human_10',count}]);
    const stage=E.hg50Status(s).stages.find(v=>v.tier===tier);
    E.startMarch(s,stage.target);let t=0;
    while(s.march&&t++<15)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
    if(!s.battle||!s.battle.hg50b)throw Error('actual route encounter missing');
    let turns=0,hitReceipts=0;
    while(s.battle&&s.battle.hg50b.phase!==phase&&turns++<100){
     E.battleAct(s,'attack');
     if(s.battle)hitReceipts+=(s.battle.lastEvents||[]).filter(q=>q.damage>0).length;
     if(!E.strictSave(s))throw Error('midbattle v07 invalid at '+turns);
    }
    if(!s.battle||s.battle.hg50b.phase!==phase)throw Error('Phase '+tier+' did not trigger');
    const q=s.battle.hg50b;
    HOG_APP_DEBUG.showCombatForTests();
    HOG_APP_DEBUG.save();
    return {version:s.version,phase:q.phase,tier:q.tier,threshold:q.threshold,turns,
       receipts:hitReceipts,strict:E.strictSave(s),events:q.events.length,extraStacks:q.extraStacks,
       enemies:s.battle.enemies.length,ui:!!document.querySelector('[data-hg50-combat-phase]'),
       label:E.hg50PhaseLabel(s.battle),target:stage.target};
   }""",{'tier':tier,'prior':prior,'phase':phase})
   check(name+' T'+str(tier)+' real damage threshold and UI',result['strict'] and result['version']==7 and result['tier']==tier and result['threshold']==pct and result['receipts']>0 and result['ui'] and result['events']>=1 and result['target'] in ['18,92','29,86','99,81'],result)
   if tier==12:check(name+' T12 maximum 18 real occupied stacks',result['enemies']<=18 and result['extraStacks']==2,result)
   if tier==13:check(name+' T13 warning is visible before buff',result['phase']=='warning' and result['events']==1 and 'CẢNH BÁO' in result['label'],result)
   screenshot=PICS/(name+'-phase-T'+str(tier)+'.png')
   page.screenshot(path=str(screenshot),animations='disabled')
   SHOTS.append({'path':str(screenshot.relative_to(ROOT)),'sha256':hashlib.sha256(screenshot.read_bytes()).hexdigest()})
   page.reload(wait_until='load',timeout=90000)
   recovered=page.evaluate("""() => {const s=HOG_APP_DEBUG.getState(),b=s.battle;
    return {version:s.version,strict:HOG_ENGINE.strictSave(s),phase:b?.hg50b?.phase,
      events:b?.hg50b?.events?.length,tier:b?.hg50b?.tier,
      ui:!!document.querySelector('[data-hg50-combat-phase]')};}""")
   check(name+' T'+str(tier)+' cold Save v07 reload retains phase/UI',recovered['strict'] and recovered['version']==7 and recovered['tier']==tier and recovered['phase']==phase and recovered['ui'],recovered)
  check(name+' zero uncaught JavaScript errors',not [e for e in ERRORS if e['viewport']==name],ERRORS)
  ctx.close()
 browser.close()
print('HG50-B CHROMIUM',sum(q['pass'] for q in CHECKS),'/',len(CHECKS))
