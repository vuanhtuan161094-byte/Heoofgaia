"""HG50 real Chromium four-view expedition/dispatch/Save v07 gate."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,hashlib,atexit,sys
ROOT=Path(__file__).resolve().parent;HTML=ROOT/'Play-Heoofgaia-HG11.html'
QA=ROOT/'docs/qa/hg50';QA.mkdir(parents=True,exist_ok=True)
EVIDENCE=ROOT/'docs/evidence/hg50';EVIDENCE.mkdir(parents=True,exist_ok=True)
CHECKS=[];SHOTS=[];ERRORS=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8',errors='replace')
def check(label,ok,detail=None):
 CHECKS.append({'name':label,'pass':bool(ok),'detail':detail})
 print(('HG50 PASS ' if ok else 'HG50 FAIL ')+label,flush=True)
 if not ok:raise AssertionError(label+' '+str(detail)[:380])
def persist():
 r={'stage':'HG50-A offline Chromium','passed':sum(x['pass'] for x in CHECKS),'total':len(CHECKS),
 'checks':CHECKS,'screenshots':SHOTS,'errors':ERRORS}
 (QA/'expedition-chromium.json').write_text(json.dumps(r,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
atexit.register(persist)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 for name,w,h,mobile in [('desktop-1280x720',1280,720,False),('phone-844x390',844,390,True),('phone-768x260',768,260,True),('phone-412x915',412,915,True)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile)
  page=ctx.new_page();page.set_default_timeout(22000)
  page.on('pageerror',lambda e,n=name:ERRORS.append({'viewport':n,'error':str(e)}))
  page.goto(HTML.as_uri(),wait_until='load',timeout=90000)
  page.locator('[data-action="race"][data-race="human"]').click()
  page.locator('[data-action="start"]').click()
  page.locator('[data-action="tab"][data-tab="boss"]').first.click()
  page.locator('[data-action="hg42-boss-screen"][data-id="expedition"]').click()
  check(name+' real expedition screen',page.locator('[data-hg50-expedition="true"]').count()==1)
  before=page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState(),q=HOG_ENGINE.hg50Status(s);
   return {version:s.version,strict:HOG_ENGINE.strictSave(s),stage:q.unlocked,
    completed:q.completed.length,
    tiers:q.stages.map(x=>x.tier),unlocks:q.stages.map(x=>x.unlocked),
    rewards:s.hg409.rewards.length,width:document.documentElement.scrollWidth,
    buttons:[...document.querySelectorAll('[data-hg50-expedition] [data-action="hg42-boss-dispatch"]')]
     .map(el=>({disabled:el.disabled,key:el.dataset.key}))};
  }""")
  check(name+' stage locks and strict v07',before['version']==7 and before['strict'] and before['stage']==1 and before['completed']==0 and before['tiers']==[11,12,13] and before['unlocks']==[True,False,False] and before['rewards']==0,before)
  buttons=before['buttons']
  check(name+' locked stages cannot dispatch',len(buttons)==3 and not buttons[0]['disabled'] and buttons[1]['disabled'] and buttons[2]['disabled'],buttons)
  check(name+' no document horizontal overflow',before['width']<=w+2,before['width'])
  img=EVIDENCE/(name+'-expedition.png');page.screenshot(path=str(img),animations='disabled')
  SHOTS.append({'path':str(img.relative_to(ROOT)),'sha256':hashlib.sha256(img.read_bytes()).hexdigest()})
  page.locator('[data-hg50-expedition] [data-action="hg42-boss-dispatch"]').first.click()
  after=page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState(),q=HOG_ENGINE.hg50Status(s);
   return {stage:q.unlocked,battle:!!s.battle,expedition:!!s.expedition,
    planner:!!document.querySelector('[data-action="dispatch-confirm"]'),
    strict:HOG_ENGINE.strictSave(s)};
  }""")
  check(name+' real planner without fake victory',after['stage']==1 and not after['battle'] and not after['expedition'] and after['planner'] and after['strict'],after)
  page.locator('#save').click()
  page.reload(wait_until='load',timeout=90000)
  saved=page.evaluate("""() => {
    const s=HOG_APP_DEBUG.getState(),q=HOG_ENGINE.hg50Status(s);
    return {version:s.version,strict:HOG_ENGINE.strictSave(s),stage:q.unlocked,done:q.done};
  }""")
  check(name+' cold reload v07 no retro progress',saved['version']==7 and saved['strict'] and saved['stage']==1 and not saved['done'],saved)
  check(name+' no page JS errors',not [e for e in ERRORS if e['viewport']==name],ERRORS)
  ctx.close()
 browser.close()
print('HG50 CHROMIUM',sum(c['pass'] for c in CHECKS),'/',len(CHECKS))
