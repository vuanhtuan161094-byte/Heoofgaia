"""HG47 real Chromium checks for the 10-slot hero panel and targeted forge.
Screenshot fixtures are clearly marked, never reported as earned battle rewards.
"""
from pathlib import Path
import json,sys,hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
OUT=ROOT/'docs'/'evidence'/'hg47';OUT.mkdir(parents=True,exist_ok=True)
QA=ROOT/'docs'/'qa'/'hg47';QA.mkdir(parents=True,exist_ok=True)
RESULTS=[];SHOTS=[];ERRORS=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8',errors='replace')
def check(label,value,details=None):
    ok=bool(value);RESULTS.append({'name':label,'pass':ok,'details':details})
    print(('HG47 PASS ' if ok else 'HG47 FAIL ')+label,flush=True)
    if not ok:raise AssertionError(label+' '+str(details)[:600])
def shot(page,label):
    f=OUT/label;page.screenshot(path=str(f),animations='disabled',full_page=False)
    SHOTS.append({'path':str(f.relative_to(ROOT)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    for label,w,h,mobile in [('desktop-1280x720',1280,720,False),
                             ('desktop-960x540',960,540,False),
                             ('phone-844x390',844,390,True),
                             ('phone-768x260',768,260,True),
                             ('phone-412x915',412,915,True)]:
        ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=mobile,is_mobile=mobile,device_scale_factor=1)
        page=ctx.new_page();page.set_default_timeout(20000)
        page.on('pageerror',lambda err,name=label:ERRORS.append({'viewport':name,'error':str(err)}))
        page.goto((ROOT/'Play-Heoofgaia-HG11.html').as_uri(),wait_until='load')
        page.locator('[data-action="start"]').click()
        page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
        page.locator('[data-action="hg408-tab"][data-id="gear"]').click()
        check(label+' ten actual unique equipment slots',
              page.locator('.hg47-ten-slots .hg46-slot').count()==10 and
              page.locator('.hg46-build-buttons button').count()==3)
        state=page.evaluate("""()=>{const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
          return {v:s.version,valid:E.strictSave(s),inventory:s.inventory.length,
             fragments:Object.values(s.hg47.fragments).reduce((a,b)=>a+b,0),
             slotKeys:E.HG47_SLOTS.map(x=>x[0])};}""")
        check(label+' no fabricated New Game materials, strict v07',
              state['v']==7 and state['valid'] and state['inventory']==0 and
              state['fragments']==0 and len(set(state['slotKeys']))==10,state)
        geom=page.evaluate("""()=>{const p=document.querySelector('.hg408-panel'),
          g=document.querySelector('.hg46-manager');
          return {page:document.documentElement.scrollWidth,viewport:innerWidth,
             gear:g.getBoundingClientRect().width,panel:p.getBoundingClientRect().width};}""")
        check(label+' responsive screen no horizontal document overflow',
              geom['page']<=w+3 and geom['gear']<=geom['panel']+3,geom)
        shot(page,label+'-10slots.png')
        page.locator('[data-action="tab"][data-tab="relics"]').first.click()
        check(label+' four race selectors and ten targeted recipes',
              page.locator('[data-action="hg47-race"]').count()==4 and
              page.locator('.hg47-recipe').count()==10 and
              page.locator('[data-action="hg47-tier"]').count()==2)
        page.locator('[data-action="hg47-tier"][data-tier="divine"]').click()
        check(label+' divine recipe is gated by real Boss and Tower wins',
              page.locator('.hg47-recipe').count()==10 and
              page.locator('[data-action="hg47-craft"]:enabled').count()==0)
        shot(page,label+'-divine-forge.png')
        if label=='desktop-1280x720':
            page.locator('[data-action="hg47-tier"][data-tier="rare"]').click()
            page.locator('[data-action="hg47-focus"][data-slot="helm"]').click()
            focus=page.evaluate("()=>HOG_APP_DEBUG.getState().hg47.focus.rare")
            check('Player selects exact helmet fragment target without earning any shard',focus=='helm')
            check('Targeting grants no fake inventory or fragment wallet',page.evaluate("""()=>{
                const s=HOG_APP_DEBUG.getState();return s.inventory.length===0&&
                  Object.values(s.hg47.fragments).every(x=>x===0)}"""))
            page.locator('[data-action="hg46-open-gear"]').click()
            fixture=page.evaluate("""()=>{
              const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),
                i=E.addItem(s,E.hg47ItemId('human','rare','helm'),'HG47 explicit Chromium QA fixture');
              HOG_APP_DEBUG.render();return {uid:i.uid,affix:E.hg47Affixes(i),strict:E.strictSave(s)};
            }""")
            check('Fixture new helm has stable real affix and canonical UID',fixture['strict'] and len(fixture['affix'])==1,fixture)
            page.locator('.hg46-inventory-card[data-hg46-uid="'+str(fixture['uid'])+'"] [data-action="hg408-equip"]').click()
            worn=page.evaluate("""uid=>{
              const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
              return {worn:s.equipment[1].helm===uid,valid:E.strictSave(s),
                  count:s.inventory.length,affix:E.hg47Affixes(s.inventory.find(i=>i.uid===uid))};
            }""",fixture['uid'])
            check('Click Wear equips actual new helmet slot, no new inventory',worn['worn'] and worn['valid'] and
                  worn['count']==1 and worn['affix']==fixture['affix'],worn)
            shot(page,'desktop-equipped-helmet.png')
            page.locator('#save').click()
            page.reload(wait_until='load')
            loaded=page.evaluate("""()=>{const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
              const uid=s.equipment?.[1]?.helm||0,row=s.inventory.find(i=>i.uid===uid);
              return {v:s.version,uid,valid:E.strictSave(s),affix:row&&E.hg47Affixes(row)};}""")
            check('Cold v07 reload retains 10-slot helmet UID and identical affixes',loaded['valid'] and
                  loaded['v']==7 and loaded['uid']==fixture['uid'] and
                  loaded['affix']==fixture['affix'],loaded)
        check(label+' no uncaught JavaScript errors',not [e for e in ERRORS if e['viewport']==label],ERRORS)
        ctx.close()
    browser.close()
report={'suite':'HG47 10-slot hero UX + earned fragment forge in Chromium',
        'passed':sum(x['pass'] for x in RESULTS),'total':len(RESULTS),
        'checks':RESULTS,'screenshots':SHOTS,'errors':ERRORS}
(QA/'chromium.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('HG47 CHROMIUM '+str(report['passed'])+'/'+str(report['total']),flush=True)
