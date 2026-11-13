"""HG30 real Chromium UI/screens at 1280x720 & 960x540; fixture paths explicitly marked.
All quest buttons dispatch to the real engine and save through canonical UI.
"""
from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
OUT=ROOT/'docs'/'evidence'/'hg30'
OUT.mkdir(parents=True,exist_ok=True)
steps=[];errors=[];screens=[]
def ok(label,condition):
    steps.append({'name':label,'pass':bool(condition)})
    print(('PASS ' if condition else 'FAIL ')+label,flush=True)
    if not condition:raise AssertionError(label)
def shot(page,name):
    p=OUT/name;page.screenshot(path=str(p));screens.append(str(p.relative_to(ROOT)))
with sync_playwright() as pw:
    launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']}
    if os.environ.get('HOG_CHROME_PATH'):
        launch['executable_path']=os.environ['HOG_CHROME_PATH']
    browser=pw.chromium.launch(**launch)
    page=browser.new_page(viewport={'width':1280,'height':720})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((ROOT/'Play-Heoofgaia-HG11.html').as_uri(),wait_until='load')
    ok('New Game available',page.locator('[data-action="start"]').is_visible())
    page.locator('[data-action="start"]').click()
    ok('New Game HG30 stage0 strict v07',page.evaluate("""()=>{
      let s=HOG_APP_DEBUG.getState();
      return s.version===7&&s.hg30?.stage===0&&HOG_ENGINE.strictSave(s);
    }"""))
    tablist=['map','city','army','heroes','magic','relics','tasks','tower','reports','sources']
    for n,tab in enumerate(tablist,1):
        page.locator(f'[data-action="tab"][data-tab="{tab}"]').first.click()
        if tab in ('army','tasks'):
            if tab=='army':
                page.locator('.hg28-army-quest > summary').click()
                ok('HG30 army drawer opens real quest and recipe panel',
                   page.locator('.hg30-quest').is_visible())
                page.evaluate('HOG_APP_DEBUG.render()')
                ok('HG30 drawer stays open after render without opening command controls',
                   page.locator('.hg28-army-quest').evaluate('(e)=>e.open') and
                   not page.locator('.hg28-army-ops:not(.hg28-army-quest)').evaluate('(e)=>e.open'))
            ok('HG30 panel appears in '+tab,page.locator('.hg30-quest').count()==1)
            ok('two real conversion recipes in '+tab,page.locator('.hg30-recipe').count()==2)
        shot(page,f'{n:02d}-{tab}-newgame-1280x720.png')
    for tab in ['map','army','tasks','tower']:
        page.set_viewport_size({'width':960,'height':540})
        page.locator(f'[data-action="tab"][data-tab="{tab}"]').first.click()
        shot(page,tab+'-newgame-960x540.png')
    page.set_viewport_size({'width':1280,'height':720})
    page.locator('[data-action="tab"][data-tab="tasks"]').first.click()
    # Explicit HIGH-RESOURCE FIXTURE, not organic combat progress.
    page.evaluate("""()=>{
      const s=HOG_APP_DEBUG.getState();s.hg30.npcWins=2;s.hg30.paidTowerWins=1;
      s.hg20.tower.floor=11;
      for(const k of Object.keys(s.hg29.shards))s.hg29.shards[k]=60;
      s.hg27.marks=60;s.hg27.tower=60;s.hg27.boss=60;s.res.gold+=60000;
      HOG_APP_DEBUG.render();
    }""")
    shot(page,'fixture-01-trial-ready-1280x720.png')
    page.locator('[data-action="hg30-claim"]').first.click()
    ok('trial click unlocks stage1 without creating troops',page.evaluate("""()=>{
      const s=HOG_APP_DEBUG.getState();return s.hg30.stage===1&&
        s.hg30.guardMade===0&&HOG_ENGINE.strictSave(s);
    }"""))
    shot(page,'fixture-02-trial-claimed-1280x720.png')
    page.locator('[data-action="hg30-convert"][data-id="guard"]').first.click()
    ok('guard click spends 12 base units and generates canonical guard',page.evaluate("""()=>{
      const s=HOG_APP_DEBUG.getState();return s.hg30.stage===2&&
        s.hg30.guardMade===1&&s.hg27.marks===48&&s.hg29.shards.wild===54&&
        s.army.human_quest_guard===4000&&HOG_ENGINE.strictSave(s);
    }"""))
    shot(page,'fixture-03-guard-converted-1280x720.png')
    page.evaluate("""()=>{
      const s=HOG_APP_DEBUG.getState();s.hg30.npcWins=3;s.hg30.bossWins=1;
      s.hg30.paidTowerWins=3;HOG_APP_DEBUG.render();
    }""")
    shot(page,'fixture-04-sovereign-ready-1280x720.png')
    page.locator('[data-action="hg30-convert"][data-id="sovereign"]').first.click()
    ok('sovereign click spends guard & both wallets, reaches stage3',page.evaluate("""()=>{
      const s=HOG_APP_DEBUG.getState();return s.hg30.stage===3&&
        s.hg30.sovereignMade===1&&s.army.human_quest_guard===3998&&
        s.army.human_tower_sovereign===4000&&s.hg29.shards.abyss===56&&
        s.hg27.boss===58&&HOG_ENGINE.strictSave(s);
    }"""))
    shot(page,'fixture-05-sovereign-converted-1280x720.png')
    page.reload(wait_until='load')
    ok('cold reload keeps stage3 and cannot multiply sovereigns',page.evaluate("""()=>{
      const s=HOG_APP_DEBUG.getState();return s.hg30.stage===3&&
        s.hg30.sovereignMade===1&&s.army.human_tower_sovereign===4000&&
        HOG_ENGINE.strictSave(s);
    }"""))
    page.locator('[data-action="tab"][data-tab="army"]').first.click()
    shot(page,'fixture-06-army-after-reload-1280x720.png')
    ok('no Chromium page exceptions',not errors)
    browser.close()
receipt={'checks':steps,'screens':screens,'errors':errors,'pass':all(x['pass'] for x in steps)}
(ROOT/'docs'/'qa'/'hg30-ui.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
print('HG30 UI '+str(sum(x['pass'] for x in steps))+'/'+str(len(steps))+' PASS')
