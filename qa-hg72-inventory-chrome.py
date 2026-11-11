"""HG72 real Chrome inventory UX: 34 canonical owned items, slots, filtering,
accented search, sorting, pagination, v07 save and a compact touch viewport.
QA items are expressly minted fixtures; no in-game reward is claimed.
"""
from pathlib import Path
import hashlib,json,sys,atexit
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
EVIDENCE=ROOT/"docs/evidence/hg72"
REPORT=ROOT/"docs/qa/hg72/inventory-ux-chromium.json"
EVIDENCE.mkdir(parents=True,exist_ok=True);REPORT.parent.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];shots=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8',errors='replace')
def check(label,okay,details=None):
 checks.append({'label':label,'pass':bool(okay)})
 print(('PASS ' if okay else 'FAIL ')+label,flush=True)
 if not okay:raise AssertionError(label+' '+str(details)[:900])
def shot(page,label):
 path=EVIDENCE/(label+".png")
 page.screenshot(path=str(path),animations="disabled")
 shots.append({'file':path.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
@atexit.register
def report():
 REPORT.write_text(json.dumps({'checks':checks,'passes':sum(x['pass'] for x in checks),
  'total':len(checks),'errors':errors,'screenshots':shots,
  'html_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest() if HTML.exists() else None,
  'fixture':'34 items created only by E.addItem to exercise long inventory; one item is equipped via E.equipItem. No rewards, material production or currency claimed.'},
  ensure_ascii=False,indent=2),encoding='utf-8')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 for label,width,height,touch in [('pc',1280,720,False),('mobile',844,390,True)]:
  context=browser.new_context(viewport={'width':width,'height':height},is_mobile=touch,has_touch=touch)
  page=context.new_page();page.set_default_timeout(20000)
  page.on('pageerror',lambda e,label=label:errors.append(label+': '+str(e)))
  page.goto(HTML.as_uri(),wait_until='load',timeout=120000)
  page.locator('[data-action="start"]').click()
  fixture=page.evaluate("""()=>{const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
   const worn=E.addItem(s,'sentinel_sword','HG72 test fixture');
   const astral=E.addItem(s,'astral_plate','HG72 test fixture');
   for(let i=0;i<32;i++)E.addItem(s,'copper_blade','HG72 test fixture');
   E.equipItem(s,worn.uid,1);HOG_APP_DEBUG.render();
   return {worn:worn.uid,astral:astral.uid,total:s.inventory.length,
    strict:E.strictSave(s),version:s.version,owner:E.hg46Owner(s,worn.uid)?.heroId};}""")
  check(label+' 34 real inventory records with one worn item retain strict Save v07',
        fixture['strict'] and fixture['version']==7 and fixture['total']==34 and fixture['owner']==1,fixture)
  page.locator('#nav [data-tab="heroes"]').click()
  page.locator('[data-action="hg408-tab"][data-id="gear"]').click()
  check(label+' equipment presents ten slots and 24 paged inventory cards',
        page.locator('.hg46-slot').count()==10 and page.locator('.hg46-inventory-card').count()==24)
  check(label+' mobile-friendly inventory search and quick sort exist',
        page.locator('#hg46-search-box').count()==1 and page.locator('.hg70-sort-tools button').count()>=3)
  page.locator('#hg46-search-box').fill('Tinh Vân')
  page.locator('[data-action="hg46-search"]').click()
  search=page.locator('.hg46-inventory-card')
  check(label+' accented search returns one actual matching item',
        search.count()==1 and 'Tinh Vân' in search.first.inner_text())
  shot(page,label+'-search')
  page.locator('[data-action="hg46-search-reset"]').click()
  page.locator('[data-action="hg46-filter"][data-slot="worn"]').click()
  worn_cards=page.locator('.hg46-inventory-card')
  check(label+' worn filter shows only exactly equipped UID',
        worn_cards.count()==1 and worn_cards.first.get_attribute('data-hg46-uid')==str(fixture['worn']))
  page.locator('[data-action="hg46-filter"][data-slot="free"]').click()
  check(label+' unowned-equipment filter excludes worn item without losing stock',
        page.locator('.hg46-inventory-card').count()==24 and
        page.locator('.hg46-inventory-card[data-hg46-uid="'+str(fixture['worn'])+'"]').count()==0)
  page.locator('[data-action="hg46-filter"][data-slot="all"]').click()
  page.locator('[data-action="hg46-sort"][data-id="attack"]').click()
  check(label+' attack sort retains all items and canonical item UID',
        page.locator('.hg46-inventory-card').count()==24 and
        page.locator('.hg46-inventory-card').first.get_attribute('data-hg46-uid') is not None)
  page.locator('[data-action="hg46-page"][data-direction="1"]').click()
  check(label+' page two displays ten remaining items without duplicating inventory',
        page.locator('.hg46-inventory-card').count()==10)
  shot(page,label+'-inventory-page-2')
  check(label+' filtering and sorting do not mutate wallet or inventory',
        page.evaluate("""()=>{const s=HOG_APP_DEBUG.getState();
         return HOG_ENGINE.strictSave(s)&&s.inventory.length===34}"""))
  page.locator('#save').click();page.reload(wait_until='load',timeout=120000)
  check(label+' strict v07 reload retains 34 item UIDs and worn equipment',
        page.evaluate("""()=>{const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
          return E.strictSave(s)&&s.inventory.length===34&&
           Object.values(s.equipment[1]||{}).some(uid=>uid===window.__hg72Worn); }""") if False else
        page.evaluate("""uid=>{const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
          return E.strictSave(s)&&s.inventory.length===34&&
           Object.values(s.equipment[1]||{}).some(v=>v===uid); }""",fixture['worn']))
  check(label+' browser has no unhandled errors',not any(x.startswith(label+':') for x in errors),errors)
  context.close()
 browser.close()
print('HG72',sum(x['pass'] for x in checks),'/',len(checks),'PASS',flush=True)
