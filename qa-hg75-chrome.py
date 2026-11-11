"""HG75 genuine file:// Chromium: real reachability, skip-to-report and
confirmed surrender with strict Save v07 on desktop and touch-size screens."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import atexit,hashlib,json,sys
ROOT=Path(__file__).resolve().parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
QA=ROOT/'docs/qa/hg75'; ART=ROOT/'docs/evidence/hg75'
QA.mkdir(parents=True,exist_ok=True);ART.mkdir(parents=True,exist_ok=True)
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf8',errors='replace')
checks=[];errors=[];shots=[]
def check(name,ok,evidence=None):
 checks.append({'name':name,'pass':bool(ok),'evidence':evidence})
 print(('HG75 CHROME PASS ' if ok else 'HG75 CHROME FAIL ')+name+' '+str(evidence)[:480],flush=True)
 if not ok:raise AssertionError(name+' '+str(evidence)[:1000])
def shot(page,name):
 target=ART/(name+'.png');page.screenshot(path=str(target),animations='disabled')
 shots.append({'file':str(target.relative_to(ROOT)),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
def save_report():
 (QA/'chromium-controls.json').write_text(json.dumps({
  'suite':'HG75 real browser terminal actions, exact Save v07 and 4 viewports',
  'html_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest() if HTML.exists() else None,
  'checks':checks,'passed':sum(c['pass'] for c in checks),'total':len(checks),
  'errors':errors,'screenshots':shots},ensure_ascii=False,indent=2),encoding='utf8')
atexit.register(save_report)
PREPARE="""() => {
 const E=HOG_ENGINE,A=HOG_APP_DEBUG;
 A.resetForTests();const s=A.getState();
 s.army.human_1=16;s.ap=900;
 E.hg20SetHeroPlan(s,s.activeHero,[{unitId:'human_1',count:8}]);
 const target=E.TILES.find(t=>t.kind==='npc'&&t.level===1&&(t.eliteTier||0)<11&&E.pathfind(E.activeCity(s).key,t.key));
 if(!target)throw Error('No reachable actual NPC');
 E.startMarch(s,target.key);
 for(let i=0;i<20&&s.march;i++)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
 if(!s.battle)throw Error('Canonical real NPC did not open');
 s.battleAuto=false;s.battle.autoUntil=Date.now()+10000000;
 A.showCombatForTests();
 const b=s.battle,selected=b.allies[0];
 return {valid:E.strictSave(s),save:s.version,range:selected.range,move:E.battleMovePreview(b,selected.id).steps,
  enemies:b.enemies.length,reports:s.battleReports.length,resources:{...s.res},ap:s.ap};
}"""
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 for label,w,h,touch in [('desktop-1280x720',1280,720,False),('desktop-960x540',960,540,False),
   ('phone-landscape-844x390',844,390,True),('phone-portrait-412x915',412,915,True)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=touch,has_touch=touch,device_scale_factor=1)
  page=ctx.new_page();page.set_default_timeout(25000)
  page.on('pageerror',lambda e,label=label:errors.append({'viewport':label,'error':str(e)}))
  page.goto(HTML.as_uri(),wait_until='load',timeout=90000)
  page.locator('[data-action="start"]').click()
  setup=page.evaluate(PREPARE)
  check(label+' real canonical 7-save and battle movement',setup['valid'] and setup['save']==7 and setup['move']>=1 and setup['enemies']>0,setup)
  skip=page.locator('[data-action="battle-finish"]')
  yield_=page.locator('[data-action="battle-surrender"]')
  check(label+' both commands exist and are enabled',skip.count()==1 and yield_.count()==1 and skip.is_enabled() and yield_.is_enabled())
  check(label+' original eight combat commands remain',page.locator('.battle-action-grid button').count()==8,
    page.locator('.battle-action-grid button').all_text_contents())
  if label in ('desktop-1280x720','phone-landscape-844x390'):shot(page,'before-'+label)
  skip.scroll_into_view_if_needed();skip.click()
  done=page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,r=s.battleReports?.[0];
   return {ended:!s.battle,valid:E.strictSave(s),reportCount:s.battleReports?.length||0,
    outcome:r?.outcome,turns:r?.turns,reportId:r?.id,save:s.version,
    modal:!!document.querySelector('#hg63-battle-result')};
  }""")
  check(label+' skip resolves actual battle to one report and Save v07',done['ended'] and done['valid'] and done['save']==7 and done['reportCount']==setup['reports']+1 and done['modal'] and done['outcome'] in ('win','lose','timeout','retreat') and done['turns']>=1,done)
  if label in ('desktop-1280x720','phone-landscape-844x390'):shot(page,'skip-report-'+label)
  setup2=page.evaluate(PREPARE)
  check(label+' fresh battle ready for surrender',setup2['valid'] and setup2['reports']==0,setup2)
  page.once('dialog',lambda dialog:dialog.accept())
  surrender=page.locator('[data-action="battle-surrender"]')
  surrender.scroll_into_view_if_needed();surrender.click()
  settled=page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,r=s.battleReports?.[0];
   return {ended:!s.battle,valid:E.strictSave(s),reportCount:s.battleReports?.length||0,
    outcome:r?.outcome,turns:r?.turns,lootGold:r?.resources?.gold,
    modal:!!document.querySelector('#hg63-battle-result')};
  }""")
  check(label+' surrender is true loss with no victory Gold and single report',
   settled['ended'] and settled['valid'] and settled['reportCount']==1 and
   settled['outcome']=='lose' and settled['turns']>=1 and
   (settled['lootGold'] or 0)==0 and settled['modal'],settled)
  if label in ('desktop-1280x720','phone-landscape-844x390'):shot(page,'surrender-report-'+label)
  ctx.close()
 browser.close()
check('no JavaScript page errors',not errors,errors)
print('HG75 CHROME FINAL',sum(c['pass'] for c in checks),'/',len(checks))
