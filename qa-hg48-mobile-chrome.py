"""HG48 Chromium acceptance for the ONE real offline HTML, not a mockup.
Check touch layouts at 768x260, 844x390, 412x915 and preserve desktop 1280x720.
Always write partial QA evidence on a failing assertion.
"""
from pathlib import Path
import atexit,hashlib,json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
OUT=ROOT/'docs'/'evidence'/'hg48';OUT.mkdir(parents=True,exist_ok=True)
QA=ROOT/'docs'/'qa'/'hg48';QA.mkdir(parents=True,exist_ok=True)
RESULTS=[];SHOTS=[];ERRORS=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8',errors='replace')
def check(name,condition,details=None):
    ok=bool(condition);RESULTS.append({'name':name,'pass':ok,'details':details})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)
    if not ok:raise AssertionError(name+' '+str(details)[:500])
def shot(page,name):
    p=OUT/name;page.screenshot(path=str(p),animations='disabled',full_page=False)
    SHOTS.append({'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
def report():
    obj={'suite':'HG48 exact HTML hero and forge touchscreen acceptance',
      'passed':sum(x['pass'] for x in RESULTS),'total':len(RESULTS),
      'checks':RESULTS,'screenshots':SHOTS,'errors':ERRORS}
    (QA/'mobile-chromium.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8')
atexit.register(report)
GEAR_JS="""() => {
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}};
 const p=document.querySelector('.hg408-panel'),cards=[...document.querySelectorAll('.hg47-ten-slots .hg46-slot')];
 const nav=document.querySelector('#nav'),head=document.querySelector('.game-window-head');
 return {width:innerWidth,pageWidth:document.documentElement.scrollWidth,
   slots:cards.length,keys:cards.map(e=>e.dataset.hg46Slot),visible:cards.filter(e=>{
     const a=rect(e),b=rect(p);return a.x>=b.x-2&&a.right<=b.right+2&&a.y>=b.y-2&&a.bottom<=b.bottom+2;
   }).length,navBottom:rect(nav).bottom,headTop:rect(head).y,
   navButtons:[...nav.querySelectorAll('button')].map(rect),
   headerDisplay:getComputedStyle(document.querySelector('.top')).display,
   strict:HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState()),saveV:HOG_APP_DEBUG.getState().version,
   inventory:HOG_APP_DEBUG.getState().inventory.length};
}"""
FORGE_JS="""() => {
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,h:r.height}};
 const body=document.querySelector('.game-window-body'),cards=[...document.querySelectorAll('.hg47-recipe')];
 const first=rect(cards[0]),visible=rect(body);
 return {recipes:cards.length,firstVisible:first.y>=visible.y-2&&first.bottom<=visible.bottom+2,
   minTap:Math.min(...[...document.querySelectorAll('.hg47-recipe-actions button')].map(e=>rect(e).h)),
   pageWidth:document.documentElement.scrollWidth,width:innerWidth,
   races:document.querySelectorAll('[data-action="hg47-race"]').length,
   tiers:document.querySelectorAll('[data-action="hg47-tier"]').length,
   strict:HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())};
}"""
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    for name,w,h,mobile in [('phone-768x260',768,260,True),('phone-844x390',844,390,True),
                            ('phone-412x915',412,915,True),('desktop-1280x720',1280,720,False)]:
        context=browser.new_context(viewport={'width':w,'height':h},has_touch=mobile,
            is_mobile=mobile,device_scale_factor=1)
        page=context.new_page();page.set_default_timeout(20000)
        page.on('pageerror',lambda e,n=name:ERRORS.append({'viewport':n,'error':str(e)}))
        page.goto(HTML.as_uri(),wait_until='load')
        page.locator('[data-action="start"]').click()
        page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
        page.locator('[data-action="hg408-tab"][data-id="gear"]').click()
        g=page.evaluate(GEAR_JS)
        check(name+' 10 unique canonical slots',g['slots']==10 and len(set(g['keys']))==10,g['keys'])
        check(name+' 10/10 gear cards fully visible in scroll panel',g['visible']==10,g)
        check(name+' no document horizontal overflow',g['pageWidth']<=w+2,g)
        check(name+' strict v07 with zero New Game inventory',g['strict'] and g['saveV']==7 and g['inventory']==0,g)
        if mobile:
            check(name+' nav controls do not cover dialog header',g['navBottom']<=g['headTop']+1,g)
            if w==412:
                check(name+' every top-level tab fits in two touch rows',
                    len(g['navButtons'])>=11 and all(t['y']>=0 and t['bottom']<=g['headTop']+1 and t['w']>=40
                    for t in g['navButtons']),g['navButtons'])
        else:
            check('desktop masthead stays visible',g['headerDisplay']!='none',g['headerDisplay'])
        shot(page,name+'-hero-10slots.png')
        page.locator('[data-action="tab"][data-tab="relics"]').first.click()
        f=page.evaluate(FORGE_JS)
        check(name+' all ten targeted recipes and four races',f['recipes']==10 and f['races']==4 and f['tiers']==2,f)
        check(name+' first forge item is visible without scrolling page horizontally',
            f['firstVisible'] and f['pageWidth']<=w+2,f)
        if mobile:
            minimum=28 if h<310 else 33 if h<500 else 37
            check(name+' forge touch buttons meet height budget',f['minTap']>=minimum,f['minTap'])
        page.locator('[data-action="hg47-tier"][data-tier="divine"]').click()
        check(name+' divine forge still requires real Boss/Tower resources',
            page.locator('[data-action="hg47-craft"]:enabled').count()==0)
        shot(page,name+'-forge-divine.png')
        page.locator('[data-action="hg47-tier"][data-tier="rare"]').click()
        page.locator('[data-action="hg47-focus"][data-slot="helm"]').click()
        check(name+' touch targeting grants no phantom fragments',page.evaluate("""()=>{
            const s=HOG_APP_DEBUG.getState();
            return s.hg47.focus.rare==='helm'&&s.inventory.length===0&&
              Object.values(s.hg47.fragments).every(x=>x===0)&&HOG_ENGINE.strictSave(s)}"""))
        check(name+' real Save v07 export/import retains chosen fragment target',page.evaluate("""()=>{
            const E=HOG_ENGINE,save=E.parseSave(E.serializeSave(HOG_APP_DEBUG.getState()));
            return save.version===7&&E.strictSave(save)&&save.hg47.focus.rare==='helm'}"""))
        check(name+' no uncaught JavaScript errors',
            not [e for e in ERRORS if e['viewport']==name],ERRORS)
        context.close()
    browser.close()
print('HG48 CHROMIUM '+str(sum(x['pass'] for x in RESULTS))+'/'+str(len(RESULTS)),flush=True)
