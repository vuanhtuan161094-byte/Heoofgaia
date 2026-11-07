"""HG36: visible Tower roster not empty after choosing real home heroes.

Uses actual offline UI and canonical Save v07, no free army or reward.
The second hero in the 2-hero scenario is an explicitly labeled QA-only
copy to test fairness and a shared 16-unit real starter garrison.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib
import json

ROOT=Path(__file__).resolve().parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
OUT=ROOT/'docs/evidence/hg36'
REPORT=ROOT/'docs/qa/hg36/tower-roster-chrome.json'
OUT.mkdir(parents=True,exist_ok=True)
REPORT.parent.mkdir(parents=True,exist_ok=True)
checks=[];screens=[];errors=[]

def check(label,passed,data=None):
    result=bool(passed)
    checks.append(dict(check=label,passed=result,detail=data))
    print(('PASS ' if result else 'FAIL ')+label+' '+str(data or '')[:340],flush=True)
    if not result: raise AssertionError(label+' '+str(data))

def screenshot(page,name):
    target=OUT/name
    page.screenshot(path=str(target),animations='disabled')
    screens.append(dict(path=str(target.relative_to(ROOT)),
                        sha256=hashlib.sha256(target.read_bytes()).hexdigest()))

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=[
        '--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    for w,h,heroes in ((1280,720,1),(960,540,2)):
        page=browser.new_page(viewport=dict(width=w,height=h))
        page.set_default_timeout(15000)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(HTML.as_uri(),wait_until='load')
        page.locator('[data-action="start"]').click()
        if heroes==2:
            fixture=page.evaluate("""() => {
              const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
              const h=JSON.parse(JSON.stringify(s.heroes[0]));
              s.heroes.push({...h,id:2,name:'QA second hero'});
              HOG_APP_DEBUG.render();
              return {valid:E.strictSave(s),army:s.army.human_1};
            }""")
            check('QA second commander is only a labeled roster fixture',fixture['valid'] and fixture['army']==16,fixture)
        page.locator('[data-action="tab"][data-tab="tower"]').first.click()
        for i in range(heroes):
            page.locator('#hg20_tower_'+str(i)).select_option(str(i+1))
        page.locator('[data-action="tower-team"]').click()
        before=page.evaluate("""() => {
          const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
          return {ready:E.hg21TowerReadiness(s),
            climbDisabled:document.querySelector('[data-action="tower-climb"]').disabled,
            choices:[...document.querySelectorAll('.hg28-tower-slots select')].map(x=>x.value),
            garrison:s.army.human_1,resources:{...s.res}};
        }""")
        check(f'{w}x{h} empty Tower choices block phantom battle',
              not before['ready']['ready'] and before['climbDisabled'] and
              before['garrison']==16 and all(not x for x in before['choices']),before)
        page.locator('[data-action="tower-auto-assign"]').click()
        after=page.evaluate("""() => {
          const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,r=E.hg21TowerReadiness(s);
          return {ready:r,climbDisabled:document.querySelector('[data-action="tower-climb"]').disabled,
            choices:[...document.querySelectorAll('.hg28-tower-slots select')].map(x=>x.value),
            perHero:[...s.hg20.tower.picks].map(x=>({
              id:x.heroId,slots:x.slots,formation:E.hg20HeroPlan(s,x.heroId)})),
            garrison:s.army.human_1,resources:{...s.res},valid:E.strictSave(s),
            text:document.querySelector('#hg36-tower-readiness')?.textContent};
        }""")
        check(f'{w}x{h} auto-splits existing 16 soldiers, never mints new troops',
              after['ready']['ready'] and after['ready']['heroes']==heroes and
              after['ready']['units']==16 and after['ready']['stacks']>=heroes and
              after['valid'] and not after['climbDisabled'] and
              after['garrison']==16 and after['resources']==before['resources'] and
              all(x['slots'] for x in after['perHero']),after)
        screenshot(page,f'tower-roster-{w}x{h}.png')
        page.locator('[data-action="tower-climb"]').click()
        opened=page.evaluate("""() => {
          const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
          return {valid:E.strictSave(s),battle:s.battle?.kind,
            owners:s.battle?.allies.map(u=>u.heroId),garrison:s.army.human_1,
            depth:s.battle?.turn};
        }""")
        check(f'{w}x{h} real Tower opens with correct hero-owned stacks and unspent garrison',
              opened['valid'] and opened['battle']=='tower' and
              sorted(set(opened['owners']))==list(range(1,heroes+1)) and
              opened['garrison']==16,opened)
        screenshot(page,f'tower-battle-{w}x{h}.png')
        page.locator('[data-action="save-combat"]').click()
        page.reload(wait_until='load')
        cold=page.evaluate("""() => {
          const s=HOG_APP_DEBUG.getState();
          return {valid:HOG_ENGINE.strictSave(s),
            owners:s.battle?.allies.map(u=>u.heroId),
            garrison:s.army.human_1};
        }""")
        check(f'{w}x{h} cold v07 reload keeps troop ownership and stock',
              cold['valid'] and cold['owners']==opened['owners'] and
              cold['garrison']==16,cold)
        page.close()
    check('No browser page errors',not errors,errors)
    browser.close()
result={'status':'PASS' if all(x['passed'] for x in checks) else 'FAIL',
        'checks':checks,'images':screens,'errors':errors,
        'offline_html_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest(),
        'fixture_policy':'Hero 2 cloned for the two-hero scenario, not shipped'}
REPORT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('HG36 TOWER CHROMIUM',sum(x['passed'] for x in checks),'/',len(checks),result['status'])
raise SystemExit(0 if result['status']=='PASS' else 1)
