"""HG27 10-screen real Chromium UI evidence at the canonical offline HTML.
No fixture resources or manipulated achievements. Windows Chrome is not claimed.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
OUT=ROOT/'docs'/'evidence'/'hg27'
QA=ROOT/'docs'/'qa'
OUT.mkdir(parents=True,exist_ok=True)
QA.mkdir(parents=True,exist_ok=True)
tabs=['map','city','army','heroes','magic','relics','tasks','tower','reports','sources']
checks=[];errors=[];screens=[]
def check(name,ok):
    checks.append({'check':name,'pass':bool(ok)})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)
    if not ok:raise AssertionError(name)
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    page=browser.new_page(viewport={'width':1280,'height':720})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((ROOT/'Play-Heoofgaia-HG11.html').as_uri(),wait_until='load')
    check('New Game button present',page.locator('[data-action="start"]').is_visible())
    page.locator('[data-action="start"]').click()
    check('Save v07 + HG27 zero tokens',page.evaluate("""() => {
      const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
      return s.version===7&&E.strictSave(s)&&s.hg27?.marks===0&&s.hg27?.tower===0&&s.hg27?.boss===0;
    }"""))
    for i,tab in enumerate(tabs):
        if tab!='map':
            page.locator(f'[data-action="tab"][data-tab="{tab}"]').first.click()
            check(tab+' opens live modal',page.locator('#game-modal:not([hidden])').count()==1)
        else:check('world map live canvas',page.locator('#world-canvas').count()==1)
        if tab in ('tasks','relics'):
            check('HG27 exchange visible on '+tab,page.locator('.hg27-exchange').count()==1)
        path=OUT/f'{i+1:02d}-{tab}-1280x720.png'
        page.screenshot(path=str(path))
        screens.append(str(path.relative_to(ROOT)))
    check('four-race special guard sprites',page.evaluate("""() =>
      ['human','elf','orc','undead'].every(r=>HOG_ART_PACK.hasUnit(r+'_quest_guard')&&
        HOG_ART_PACK.hasUnit(r+'_tower_sovereign'))"""))
    check('no JS exceptions',not errors)
    for tab in ['map','tasks','relics']:
        page.set_viewport_size({'width':960,'height':540})
        page.locator(f'[data-action="tab"][data-tab="{tab}"]').first.click()
        path=OUT/f'{tab}-960x540.png'
        page.screenshot(path=str(path))
        screens.append(str(path.relative_to(ROOT)))
    browser.close()
receipt={'pass':all(q['pass'] for q in checks),'checks':checks,'errors':errors,'screens':screens}
(QA/'hg27-ui.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
print('HG27 '+str(sum(q['pass'] for q in checks))+'/'+str(len(checks))+' PASS',flush=True)
