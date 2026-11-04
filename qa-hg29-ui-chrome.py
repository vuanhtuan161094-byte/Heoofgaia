"""HG29 real Chromium: screenshots and keyboard/mouse visible state, not mockups."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
OUT=ROOT/'docs'/'evidence'/'hg29'
OUT.mkdir(parents=True,exist_ok=True)
checks=[]
errors=[]
screens=[]
def check(name,value):
    ok=bool(value)
    checks.append({'name':name,'pass':ok})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)
    if not ok:raise AssertionError(name)
def shot(page,name):
    p=OUT/name
    page.screenshot(path=str(p))
    screens.append(str(p.relative_to(ROOT)))
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    page=browser.new_page(viewport={'width':1280,'height':720})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((ROOT/'Play-Heoofgaia-HG11.html').as_uri(),wait_until='load')
    check('New Game control visible',page.locator('[data-action="start"]').is_visible())
    page.locator('[data-action="start"]').click()
    check('New Game Save v07 HG29 initializes empty shards',page.evaluate("""()=>{
      const s=HOG_APP_DEBUG.getState();
      return s.version===7&&HOG_ENGINE.strictSave(s)&&s.hg29&&
        Object.values(s.hg29.shards).every(n=>n===0);
    }"""))
    page.locator('[data-action="findnpc"]').first.click()
    check('NPC selected map preview shown',page.locator('.hg29-preview').count()==1)
    shot(page,'01-world-NPC-1280x720.png')
    page.locator('[data-action="tab"][data-tab="relics"]').first.click()
    check('Real relic modal + 7 fragment recipes',page.locator('#game-modal:not([hidden])').count()==1 and
       page.locator('.hg29-recipe').count()==7 and page.locator('.hg29-wallet').count()==1)
    shot(page,'02-relics-fragments-1280x720.png')
    page.locator('[data-action="tab"][data-tab="tasks"]').first.click()
    check('6 farm pools and paid rewards guide',page.locator('.hg29-guides>.card').count()==6)
    shot(page,'03-tasks-drop-guide-1280x720.png')
    page.locator('[data-action="tab"][data-tab="tower"]').first.click()
    check('Tower remains available',page.locator('#game-modal:not([hidden])').count()==1)
    shot(page,'04-tower-1280x720.png')
    page.locator('[data-action="tab"][data-tab="reports"]').first.click()
    shot(page,'05-reports-1280x720.png')
    page.set_viewport_size({'width':960,'height':540})
    for tab in ['map','relics','tasks']:
        page.locator(f'[data-action="tab"][data-tab="{tab}"]').first.click()
        shot(page,tab+'-960x540.png')
    check('Zero uncaught JS errors',not errors)
    browser.close()
receipt={'pass':all(q['pass'] for q in checks),'checks':checks,'errors':errors,'screens':screens}
(ROOT/'docs'/'qa'/'hg29-ui.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
print('HG29 UI '+str(sum(q['pass'] for q in checks))+'/'+str(len(checks))+' PASS',flush=True)
