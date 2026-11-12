"""HG40.8: real offline Chromium hero UI, live actions and v07 Save acceptance.
Viewport screenshots are genuine browser captures; fixtures are identified.
"""
from pathlib import Path
import hashlib
import json
import os
import sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
EVIDENCE=ROOT/'docs'/'evidence'/'hg408'
QA=ROOT/'docs'/'qa'/'hg408'
EVIDENCE.mkdir(parents=True,exist_ok=True)
QA.mkdir(parents=True,exist_ok=True)
CHECKS=[]
SHOTS=[]
ERRORS=[]
if hasattr(sys.stdout,'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8',errors='replace')

def check(name,condition,details=None):
    ok=bool(condition)
    CHECKS.append({'name':name,'pass':ok,'details':details})
    print(('PASS' if ok else 'FAIL')+' HG40.8 '+name,flush=True)
    if not ok:
        raise AssertionError(name+' '+str(details)[:350])

def screenshot(page,name):
    p=EVIDENCE/name
    page.screenshot(path=str(p),animations='disabled')
    SHOTS.append({'file':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})

with sync_playwright() as browser_tool:
    launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']}
    if os.environ.get('HOG_CHROME_PATH'):
        launch['executable_path']=os.environ['HOG_CHROME_PATH']
    browser=browser_tool.chromium.launch(**launch)
    for label,width,height,mobile in [
        ('pc-1280x720',1280,720,False),
        ('phone-844x390',844,390,True),
        ('phone-768x260',768,260,True),
        ('phone-412x915',412,915,True),
    ]:
        context=browser.new_context(viewport={'width':width,'height':height},
                                    is_mobile=mobile,has_touch=mobile,
                                    device_scale_factor=2 if mobile else 1)
        page=context.new_page()
        page.set_default_timeout(16000)
        page.on('pageerror',lambda error,label=label:ERRORS.append({'viewport':label,'message':str(error)}))
        page.goto(HTML.as_uri(),wait_until='load',timeout=55000)
        page.locator('[data-action="start"]').click()
        initial=page.evaluate("""() => {
            const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
            return {version:s.version,valid:E.strictSave(s),quality:s.heroes[0].quality,
                    count:s.heroes.length};
        }""")
        check(label+' fresh New Game is strict v07 and quality migrated',
              initial['version']==7 and initial['valid'] and
              initial['quality'] in ('white','blue','yellow','green','purple'),initial)
        page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
        check(label+' new real six-tab hero screen exists',
              page.locator('.hg408-screen').count()==1 and
              page.locator('.hg408-tabs button').count()==6)
        geometry=page.evaluate("""() => {
            const rect=e=>{const r=e.getBoundingClientRect();
                return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
            const tabs=[...document.querySelectorAll('.hg408-tabs button')].map(rect);
            return {screen:rect(document.querySelector('.hg408-screen')),
                    roster:rect(document.querySelector('.hg408-roster')),
                    profile:rect(document.querySelector('.hg408-profile')),
                    tabs,viewW:innerWidth,viewH:innerHeight,
                    scrollW:document.documentElement.scrollWidth};
        }""")
        check(label+' hero UI fits horizontally, has usable profile and tab hitboxes',
              geometry['scrollW']<=width+3 and
              geometry['profile']['w']>=min(width*.43,360) and
              geometry['screen']['h']>80 and
              all(t['w']>=44 and t['h']>=21 and t['right']<=width+2 for t in geometry['tabs']),
              geometry)
        for i in range(1,len(geometry['tabs'])):
            check(label+' adjacent tabs do not overlap '+str(i),
                  geometry['tabs'][i]['x']>=geometry['tabs'][i-1]['right']-1)
        check(label+' seven rarity cards are present in the hero roster',
              page.locator('.hg45-quality-legend .hg45-legend-chip').count()==7)
        screenshot(page,label+'-hero-overview.png')
        page.locator('[data-action="hg408-tab"][data-id="stats"]').click()
        check(label+' stats are live and visible',page.locator('.hg408-stat').count()==4)
        screenshot(page,label+'-hero-stats.png')
        page.locator('[data-action="hg408-tab"][data-id="ascend"]').click()
        check(label+' rank/rebirth call actual legacy action IDs',
              page.locator('[data-action="hg18-rank"]').count()==1 and
              page.locator('[data-action="hg18-rebirth"]').count()==1)
        page.locator('[data-action="hg408-tab"][data-id="gear"]').click()
        check(label+' equipment has ten distinct real slots',
              page.locator('.hg47-ten-slots .hg408-slot').count()==10 and
              page.evaluate("""() => {
                const slots=[...document.querySelectorAll('.hg47-ten-slots .hg408-slot')]
                  .map(el=>el.dataset.hg46Slot);
                return slots.length===10 && new Set(slots).size===10 &&
                  HOG_ENGINE.HG47_SLOTS.every(([key])=>slots.includes(key));
              }"""))
        page.locator('[data-action="hg408-tab"][data-id="tavern"]').click()
        check(label+' Tavern offers actual hire action',
              page.locator('.hg408-offer [data-action="hirecandidate"]').count()>0)
        screenshot(page,label+'-hero-tavern.png')
        if label=='pc-1280x720':
            # At 1% each, both rare qualities in ONE eight-offer refresh
            # is uncommon. Independently observe each real natural roll.
            for rare_kind in ('platinum','rainbow'):
                rare=page.evaluate("""rarity => {
                    const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
                    s.buildings.tavern=10;let rounds=0;
                    do{E.refreshTavern(s);rounds++}
                    while(rounds<600&&!s.tavern.offers.some(x=>x.quality===rarity));
                    E.syncCityState(s);HOG_APP_DEBUG.render();
                    const selected=s.tavern.offers.find(x=>x.quality===rarity);
                    return {rounds,quality:s.tavern.offers.map(x=>x.quality),
                        score:selected?.qualityScore,
                        derived:selected&&E.heroTierByTotal(selected.atk+selected.def+selected.spd+selected.int).id,
                        strict:E.strictSave(s),chance:E.heroQualityChances(10)};
                }""",rare_kind)
                check('Live Tavern naturally rolls '+rare_kind+' with summed-stat quality and strict Save',
                      rare['rounds']<600 and rare['strict'] and
                      rare_kind in rare['quality'] and
                      rare['derived']==rare_kind and
                      rare['chance'][5:]==[1,1],rare)
                check('Rarity card '+rare_kind+' has real SVG portrait, readable sum and aura',
                      page.locator('.hg408-offer.hg45-tier-'+rare_kind).count()>=1 and
                      page.locator('.hg408-offer.hg45-tier-'+rare_kind+' .hg45-portrait-art svg').count()>=1 and
                      page.locator('.hg408-offer.hg45-tier-'+rare_kind+' .hg45-offer-buff').count()>=1)
                screenshot(page,'pc-1280x720-'+rare_kind+'-natural-tavern.png')
            # Fame is elevated only as a test fixture to allow recruiting a second hero.
            prepared=page.evaluate("""() => {
                const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
                s.fame=10000;s.buildings.tavern=6;s.tavern.round=0;
                E.refreshTavern(s);E.ensure08(s);HOG_APP_DEBUG.render();
                return {cap:E.heroCountLimit(s.fame),valid:E.strictSave(s),
                        offers:s.tavern.offers.length,blue:s.tavern.offers.filter(o=>o.quality==='blue').length};
            }""")
            check('Fame-cap fixture has room for second hero and valid Save',
                  prepared['cap']>=2 and prepared['valid'] and prepared['offers']>=5 and prepared['blue']>=1,prepared)
            page.locator('.hg408-offer:has(.hg408-quality-blue) [data-action="hirecandidate"]').click()
            recruited=page.evaluate("""() => {
                const s=HOG_APP_DEBUG.getState(),h=s.heroes.at(-1);
                return {id:h.id,quality:h.quality,count:s.heroes.length,
                        valid:HOG_ENGINE.strictSave(s)};
            }""")
            check('Real Tavern button hires exactly one hero and writes stable quality',
                  recruited['count']==2 and recruited['valid'] and
                  recruited['quality']=='blue',recruited)
            second=recruited['id']
            page.locator('.hg408-roster-card[data-id="'+str(second)+'"]').click()
            check('Roster selection changes profile without changing combat commander',
                  page.evaluate("""id => document.querySelector('.hg408-identity-main h2').textContent===
                    HOG_APP_DEBUG.getState().heroes.find(h=>h.id===id).name &&
                    HOG_APP_DEBUG.getState().activeHero!==id""",second))
            screenshot(page,'pc-1280x720-recruited-hero.png')
            page.locator('[data-action="hg408-tab"][data-id="overview"]').click()
            page.locator('[data-action="hg408-dismiss-review"]').click()
            check('Step one explicitly describes gear and no gold refund',
                  page.locator('.hg408-dismiss-dialog').count()==1 and
                  'Không hoàn vàng' in page.locator('.hg408-dismiss-dialog').inner_text())
            screenshot(page,'pc-1280x720-dismiss-review.png')
            page.locator('[data-action="hg408-dismiss-next"]').click()
            check('Step two is a distinct confirmation',
                  page.locator('[data-action="hg408-dismiss-apply"]').is_visible())
            page.locator('[data-action="hg408-dismiss-apply"]').click()
            removed=page.evaluate("""id => {
                const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
                return {count:s.heroes.length,missing:!s.heroes.some(h=>h.id===id),
                        valid:E.strictSave(s),dangling:E.hg408DanglingRefs(s,id),
                        version:s.version};
            }""",second)
            check('Real two-step UI dismisses and leaves strictly valid v07 Save',
                  removed['missing'] and removed['count']==1 and removed['valid'] and
                  removed['version']==7 and not removed['dangling'],removed)
            page.locator('#save').click()
            page.reload(wait_until='load')
            reloaded=page.evaluate("""id => {
                const s=HOG_APP_DEBUG.getState();
                return {version:s.version,count:s.heroes.length,valid:HOG_ENGINE.strictSave(s),
                        absent:!s.heroes.some(h=>h.id===id)};
            }""",second)
            check('Dismissal persists after real browser Save/Reload',
                  reloaded['valid'] and reloaded['version']==7 and
                  reloaded['count']==1 and reloaded['absent'],reloaded)
            page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
            page.locator('[data-action="hg408-dismiss-review"]').click()
            check('Last hero cannot be dismissed, reason is explicit and next step disabled',
                  page.locator('.hg408-dismiss-dialog').count()==1 and
                  page.locator('[data-action="hg408-dismiss-next"]').is_disabled() and
                  'cuối cùng' in page.locator('.hg408-dismiss-dialog').inner_text())
            screenshot(page,'pc-1280x720-last-hero-guard.png')
        check(label+' no uncaught JS exception',not [e for e in ERRORS if e['viewport']==label],ERRORS)
        context.close()
    browser.close()
report={'suite':'HG40.8 real Chromium heroes', 'checks':CHECKS, 'shots':SHOTS,'errors':ERRORS}
(QA/'hero-chromium.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('HG40.8 CHROMIUM '+str(sum(x['pass'] for x in CHECKS))+'/'+str(len(CHECKS)),flush=True)
