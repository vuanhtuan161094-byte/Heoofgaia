"""HG35 City construction/recruitment UX: exact spending, unlocks, max batch and old Save v07.

Only initial UI actions are performed on a real New Game state. A separate,
labeled in-memory fixture tops resources up to warehouse capacity solely to
test recruitment batches >1000; it never grants troops/resources to the player.
"""
from pathlib import Path
import json
import hashlib
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
REPORT=ROOT/'docs/qa/hg35/city-recruit-chrome.json'
SCREENS=ROOT/'docs/evidence/hg35'
REPORT.parent.mkdir(parents=True,exist_ok=True)
SCREENS.mkdir(parents=True,exist_ok=True)
checks=[]
errors=[]
captures=[]

def check(name,truth,evidence=None):
    good=bool(truth);checks.append({'name':name,'pass':good,'evidence':evidence})
    print(('PASS ' if good else 'FAIL ')+name+' '+str(evidence or '')[:380],flush=True)
    if not good:raise AssertionError(name+' '+str(evidence))

def capture(page,name):
    path=SCREENS/name;page.screenshot(path=str(path),animations='disabled')
    captures.append({'file':str(path.relative_to(ROOT)),
                     'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    page=browser.new_page(viewport={'width':1280,'height':720})
    page.set_default_timeout(14000)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(HTML.as_uri(),wait_until='load')
    page.locator('[data-action="start"]').click()
    page.locator('[data-action="tab"][data-tab="city"]').first.click()
    selected=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
      return {valid:E.strictSave(s),
        level:s.buildings.hall,
        building:document.querySelector('.hg28-selected-building h2')?.textContent,
        effect:document.querySelector('.hg35-building-effects')?.innerText,
        ledger:document.querySelectorAll('.hg35-cost-line').length};
    }""")
    check('Real New Game city displays implemented Hall effects and five resource deductions',
          selected['valid'] and selected['level']==1 and
          selected['building']=='Town Hall' and
          'Vàng' in (selected['effect'] or '') and selected['ledger']==5,selected)
    page.locator('[data-action="building"][data-key="warehouse"]').click()
    warehouse=page.locator('.hg35-building-effects').inner_text()
    check('Warehouse explicitly distinguishes resource storage from troop command',
          'KHÔNG giới hạn quân' in warehouse and 'Dung lượng' in warehouse,warehouse)
    page.locator('[data-action="building"][data-key="market"]').click()
    quoted=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,cost=E.buildCost(s,'market');
      const displays=[...document.querySelectorAll('.hg35-cost-line')].map(node=>node.innerText);
      window._hg35Before={res:{...s.res},cost};
      return {cost,displays,can:E.canAfford(s,cost),effect:document.querySelector('.hg35-building-effects')?.innerText};
    }""")
    check('Market build clearly previews what is deducted before click',
          quoted['can'] and len(quoted['displays'])==5 and
          all('→' in x and '−' in x for x in quoted['displays']) and
          'giao dịch' in quoted['effect'].lower(),quoted)
    capture(page,'city-market-cost-before-1280x720.png')
    page.locator('[data-action="upgrade"][data-key="market"]').click()
    built=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),before=window._hg35Before;
      const lost=Object.fromEntries(Object.keys(before.cost).map(k=>[k,before.res[k]-s.res[k]]));
      return {queue:s.buildingQueue?.key,valid:HOG_ENGINE.strictSave(s),lost,
        paid:before.cost,toasting:document.getElementById('toast')?.textContent};
    }""")
    check('Actual Market button pays correct resources and starts one authentic building queue',
          built['queue']=='market' and built['valid'] and
          all(abs(built['lost'][k]-v)<2 for k,v in built['paid'].items()) and
          'Đã trừ' in built['toasting'],built)
    page.locator('[data-action="tab"][data-tab="army"]').first.click()
    army=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
      return {valid:E.strictSave(s),hasMax:document.querySelector('[data-action="recruit-max"][data-id="human_1"]')!==null,
        garrison:document.querySelector('.hg35-garrison-info')?.innerText,
        quote:document.querySelector('#pay_human_1')?.textContent,
        shownMax:document.querySelector('#q_human_1')?.max,
        actualMax:E.recruitMax(s,'human_1')};
    }""")
    check('Troops in city have no fake hero-limit cap and real max-affordable UI',
          army['valid'] and army['hasMax'] and
          'Không áp dụng giới hạn chỉ huy' in (army['garrison'] or '') and
          army['actualMax']>0 and abs(int(army['shownMax'])-army['actualMax'])<=2,army)
    # Passive economy ticks can increase the affordable count after the card
    # was first rendered. Clicking MAX recomputes against live resources.
    page.locator('#q_human_1').fill('7')
    quote=page.locator('#pay_human_1').inner_text()
    check('Changing quantity updates the actual 7-troop total and remaining-resource quote',
          'TRỪ KHI TUYỂN 7 quân' in quote and 'còn ' in quote and
          'Huấn luyện' in quote,quote)
    page.locator('[data-action="recruit-max"][data-id="human_1"]').click()
    maxSelect=page.evaluate("""() => ({
      selected:Number(document.querySelector('#q_human_1').value),
      max:HOG_ENGINE.recruitMax(HOG_APP_DEBUG.getState(),'human_1'),
      quote:document.querySelector('#pay_human_1')?.textContent,
      enabled:!document.querySelector('[data-action="recruit"][data-id="human_1"]').disabled
    })""")
    check('One-click MAX picks exact affordable quantity, not old 1000 arbitrary cap',
          maxSelect['selected']==maxSelect['max'] and maxSelect['enabled'] and
          str(maxSelect['max']) in maxSelect['quote'],maxSelect)
    capture(page,'army-recruit-max-1280x720.png')
    beforeRecruit=page.evaluate("""() => {
      const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),n=Number(document.querySelector('#q_human_1').value);
      window._hg35UnitBefore={n,cost:E.recruitCost(s,E.getUnit(s,'human_1'),n),
                              res:{...s.res},army:s.army.human_1,queue:s.training.length};
      return window._hg35UnitBefore;
    }""")
    page.locator('[data-action="recruit"][data-id="human_1"]').click()
    paid=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),o=window._hg35UnitBefore;
      return {valid:HOG_ENGINE.strictSave(s),army:s.army.human_1,
        queue:s.training.length,queued:s.training.at(-1)?.count,
        cost:Object.fromEntries(Object.keys(o.cost).map(k=>[k,o.res[k]-s.res[k]])),
        toast:document.getElementById('toast')?.textContent};
    }""")
    check('MAX recruitment subtracts exact resources and queues only paid troops',
          paid['valid'] and paid['army']==beforeRecruit['army'] and
          paid['queue']==beforeRecruit['queue']+1 and
          paid['queued']==beforeRecruit['n'] and
          all(abs(paid['cost'][k]-v)<2 for k,v in beforeRecruit['cost'].items()) and
          'Đã trừ' in paid['toast'],paid)
    page.reload(wait_until='load')
    afterReload=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();
      return {valid:HOG_ENGINE.strictSave(s),market:s.buildingQueue?.key,
        queued:s.training.at(-1)?.count};
    }""")
    check('Cold localStorage Save v07 preserves paid construction and recruitment',
          afterReload['valid'] and afterReload['market']=='market' and
          afterReload['queued']==beforeRecruit['n'],afterReload)
    page.set_viewport_size({'width':960,'height':540})
    page.locator('[data-action="tab"][data-tab="city"]').first.click()
    page.locator('[data-action="building"][data-key="warehouse"]').click()
    small=page.evaluate("""() => ({
      label:document.querySelector('.hg35-building-effects')?.innerText,
      scrollOverflow:document.documentElement.scrollWidth-innerWidth,
      buildingButton:document.querySelectorAll('.hg28-building-grid [data-action="building"]').length,
      ledger:document.querySelectorAll('.hg35-cost-line').length
    })""")
    check('Compact landscape city retains building selection, effects and resource ledger',
          'KHÔNG giới hạn quân' in (small['label'] or '') and small['buildingButton']>=10 and
          small['ledger']==5 and small['scrollOverflow']<=1,small)
    capture(page,'city-warehouse-960x540.png')
    # Separate fixture: test that the old 1000-troop recruitment request
    # ceiling has actually been removed, not that large armies are gifted.
    capacity=page.evaluate("""() => {
      const E=HOG_ENGINE,s=E.make('human',Date.now());
      for(const k of E.C.keys)s.res[k]=E.limits(s)[k];
      const heroCap=E.heroLimit(s.heroes[0].level),
        n=E.recruitMax(s,'human_1'),unit=E.getUnit(s,'human_1');
      const paid=E.recruit(s,'human_1',n);
      const trueStorage=s.army.human_1;
      s.army.human_1=heroCap+100;
      return {max:n,oldLimit:1000,price:paid,
        queued:s.training.at(-1)?.count,
        noTroopStorageCap:E.strictSave(s),
        hasNoExcessGrant:trueStorage===16,
        commanderCapacity:heroCap};
    }""")
    check('Independent warehouse-funded fixture can recruit >1000 without army capacity gate',
          capacity['max']>1000 and capacity['queued']==capacity['max'] and
          capacity['noTroopStorageCap'] and capacity['hasNoExcessGrant'],capacity)
    page.close()
    check('No uncaught JavaScript errors',not errors,errors)
    browser.close()
receipt={'pass':all(x['pass'] for x in checks),'checks':checks,'errors':errors,
         'screenshots':captures,
         'source_html_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest(),
         'background_note':'Open Field V2 local-only not available on GitHub; remote still embeds historical human-meadow until asset pushed',
         'fixture_note':'High-stock recruitment is a separate in-memory QA fixture, never player reward'}
REPORT.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('HG35 CITY & RECRUIT CHROMIUM',sum(x['pass'] for x in checks),'/',len(checks),
      'PASS' if receipt['pass'] else 'FAIL',flush=True)
