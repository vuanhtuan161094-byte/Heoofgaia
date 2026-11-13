"""HG46/HG47 Chromium regression: legacy 3-item set in the 10-slot hero gear UI.
Fixtures provide items only to exercise the UI, never pretend they dropped.
"""
from pathlib import Path
import hashlib,json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
OUT=ROOT/'docs'/'evidence'/'hg46';OUT.mkdir(parents=True,exist_ok=True)
QA=ROOT/'docs'/'qa'/'hg46';QA.mkdir(parents=True,exist_ok=True)
CHECKS=[];SHOTS=[];ERRORS=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8',errors='replace')
def check(name,condition,details=None):
    ok=bool(condition);CHECKS.append({'name':name,'pass':ok,'details':details})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)
    if not ok:raise AssertionError(name+' '+str(details)[:600])
def capture(page,name):
    f=OUT/name;page.screenshot(path=str(f),animations='disabled')
    SHOTS.append({'file':str(f.relative_to(ROOT)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})

# Always preserve partial QA evidence if a viewport assertion fails early.
# GitHub Actions uploads these reports with if: always().
import atexit
def _save_partial_acceptance():
    report={'suite':'qa-hg46-equipment-chrome.py' ,'passed':sum(bool(x.get('pass')) for x in CHECKS),
            'total':len(CHECKS),
            'checks':CHECKS,
            'screenshots':SHOTS,'errors':ERRORS}
    (QA/'equipment-chromium.json').write_text(
        json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
atexit.register(_save_partial_acceptance)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    for label,w,h,mobile in [
        ('desktop-1280x720',1280,720,False),
        ('desktop-960x540',960,540,False),
        ('phone-844x390',844,390,True),
        ('phone-768x260',768,260,True),
        ('phone-412x915',412,915,True)
    ]:
        ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=mobile,is_mobile=mobile,device_scale_factor=1)
        page=ctx.new_page();page.set_default_timeout(20000)
        page.on('pageerror',lambda err,label=label:ERRORS.append({'viewport':label,'message':str(err)}))
        page.goto((ROOT/'Play-Heoofgaia-HG11.html').as_uri(),wait_until='load')
        page.locator('[data-action="start"]').click()
        page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
        page.locator('[data-action="hg408-tab"][data-id="gear"]').click()
        check(label+' equipment management exists with ten actual slots',
              page.locator('.hg46-manager').count()==1 and
              page.locator('.hg46-slot').count()==10 and
              page.locator('.hg46-build-buttons button').count()==3)
        check(label+' original empty equipment is strict Save v07',
              page.evaluate('HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState()) && HOG_APP_DEBUG.getState().version===7'))
        geom=page.evaluate("""() => {
          const panel=document.querySelector('.hg408-panel'),manager=document.querySelector('.hg46-manager'),
           rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,w:r.width,right:r.right,y:r.y,h:r.height}};
          return {panel:rect(panel),manager:rect(manager),scrollW:panel.scrollWidth,clientW:panel.clientWidth,
             viewport:innerWidth,pageScroll:document.documentElement.scrollWidth};
        }""")
        check(label+' gear panel stays within live screen without document overflow',
              geom['pageScroll']<=w+3 and geom['manager']['w']<=geom['panel']['w']+3 and
              geom['panel']['w']>=min(w*.4,250),geom)
        capture(page,label+'-newgame-gear.png')
        if label=='desktop-1280x720':
            # These four items are explicit UI QA fixtures: proof that equip,
            # enhancement, set activation and Save use the real engine.
            sample=page.evaluate("""() => {
              const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
              s.hg18.materials.enhance_stone=40;
              const items=['sentinel_sword','sentinel_plate','sentinel_seal','copper_blade'];
              const ids=items.map(id=>E.addItem(s,id,'HG46 visual QA fixture').uid);
              E.syncCityState(s);HOG_APP_DEBUG.render();
              return {uids:ids,valid:E.strictSave(s),gold:s.res.gold};
            }""")
            check('Gear fixture items enter single inventory with strict Save',
                  sample['valid'] and len(sample['uids'])==4,sample)
            check('Real gear cards show four distinct UID ownership records',
                  page.locator('.hg46-inventory-card').count()==4)
            capture(page,'desktop-1280x720-four-gear-fixtures.png')
            page.locator('.hg46-inventory-card:has(.hg46-kind-sentinel)').count()
            page.locator('.hg46-inventory-card[data-hg46-uid="'+str(sample['uids'][0])+'"]').click()
            page.locator('.hg83-inspector [data-action="hg408-equip"]').click()
            equip=page.evaluate("""uid => {
              const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
              return {worn:s.equipment[1].weapon===uid,owner:E.hg46Owner(s,uid),
               count:s.inventory.length,strict:E.strictSave(s)};
            }""",sample['uids'][0])
            check('Real Wear action equips only one owned sword and keeps same inventory',
                  equip['worn'] and equip['owner']['heroId']==1 and equip['count']==4 and equip['strict'],equip)
            # Record the exact paid transaction INSIDE the actual engine
            # handler. Production accrues passively between UI clicks, so
            # comparing wallet snapshots seconds apart is not a valid cost oracle.
            page.evaluate("""() => {
              const E=HOG_ENGINE,orig=E.enhanceHG18;
              E.enhanceHG18=(state,uid)=>{
                const gold=state.res.gold,stones=state.hg18.materials.enhance_stone;
                const result=orig(state,uid);
                window.__hg46EnhancePaid={gold:gold-state.res.gold,
                  stones:stones-state.hg18.materials.enhance_stone,uid};
                return result;
              };
            }""")
            page.locator('.hg46-inventory-card[data-hg46-uid="'+str(sample['uids'][0])+'"]').click()
            page.locator('.hg83-inspector [data-action="hg18-enhance"]').click()
            upgraded=page.evaluate("""uid => {
              const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
              return {level:s.inventory.find(x=>x.uid===uid).enhance,
               stones:s.hg18.materials.enhance_stone,gold:s.res.gold,
               paid:window.__hg46EnhancePaid,
               stats:E.hg46Stats(s.inventory.find(x=>x.uid===uid)),strict:E.strictSave(s)};
            }""",sample['uids'][0])
            check('Real Enhance charges exactly 2 stones and 250 gold despite passive production',
                  upgraded['level']==1 and upgraded['stones']==38 and
                  upgraded['paid']['gold']==250 and upgraded['paid']['stones']==2 and
                  upgraded['paid']['uid']==sample['uids'][0] and
                  upgraded['strict'] and upgraded['stats']['atk']>9,upgraded)
            capture(page,'desktop-1280x720-equipped-enhanced-sword.png')
            page.locator('[data-action="hg46-auto"][data-mode="balanced"]').click()
            combo=page.evaluate("""() => {
              const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
              return {slots:s.equipment[1],sentinel:E.hg18SetCounts(s,1).sentinel||0,
               items:s.inventory.length,strict:E.strictSave(s),
               combat:E.combatModifiers(s,1)};
            }""")
            check('Real one-click balanced build wears three earned-set pieces and activates combat buff',
                  combo['sentinel']==3 and combo['items']==4 and
                  len(combo['slots'])==3 and combo['strict'] and combo['combat']['damageBonus']>0,combo)
            capture(page,'desktop-1280x720-set-3-of-3.png')
            page.locator('#save').click()
            page.reload(wait_until='load')
            reloaded=page.evaluate("""() => {
              const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
              return {v:s.version,valid:E.strictSave(s),
               sentinel:E.hg18SetCounts(s,1).sentinel||0,
               sword:s.inventory.find(x=>x.itemId==='sentinel_sword')?.enhance||0};
            }""")
            check('Save and cold reload keep full set and enhanced real item UID',
                  reloaded['v']==7 and reloaded['valid'] and reloaded['sentinel']==3 and reloaded['sword']==1,reloaded)
            page.locator('[data-action="tab"][data-tab="relics"]').first.click()
            check('Forge includes direct real link into hero inventory',
                  page.locator('[data-action="hg46-open-gear"]').count()==1)
            page.locator('[data-action="hg46-open-gear"]').click()
            check('Forge link opens real hero gear tab without extra page',
                  page.locator('.hg46-manager').count()==1 and page.locator('.hg46-slot').count()==10)
            capture(page,'desktop-1280x720-forge-to-gear.png')
        check(label+' no uncaught JS errors',not [e for e in ERRORS if e['viewport']==label],ERRORS)
        ctx.close()
    browser.close()
report={'suite':'HG46 real browser gear UI', 'passed':sum(x['pass'] for x in CHECKS),
 'total':len(CHECKS),'checks':CHECKS,'shots':SHOTS,'errors':ERRORS}
(QA/'equipment-chromium.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('HG46 CHROMIUM '+str(report['passed'])+'/'+str(report['total']),flush=True)
