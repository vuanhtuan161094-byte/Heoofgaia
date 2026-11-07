"""HG29 real Chromium: screenshots and keyboard/mouse visible state, not mockups."""
from pathlib import Path
import json
import os
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
    launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']}
    if os.environ.get('HOG_CHROME_PATH'):launch['executable_path']=os.environ['HOG_CHROME_PATH']
    browser=pw.chromium.launch(**launch)
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
    # HG39 replaced the old visible "find NPC" shortcut with the real map
    # target card. Select a reachable NPC camp through the canvas itself; the
    # legacy findnpc button remains in the DOM but is intentionally hidden.
    npc=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,P=HOG_PAINTER,
        canvas=document.getElementById('world-canvas'),camera=P.mapCamera(),
        scale=camera.zoom*48,offsetX=canvas.width/2-camera.centerX*scale,
        offsetY=canvas.height/2-camera.centerY*scale,
        rect=canvas.getBoundingClientRect(),home=E.activeCity(s);
      const visible=E.NPC_CAMPS_2009.map(q=>{
        const tile=E.getTile(q.key),x=offsetX+(tile.x+.5)*scale,y=offsetY+(tile.y+.5)*scale;
        return {q,x,y};
      }).filter(({q,x,y})=>E.pathfind(home.key,q.key)&&x>=0&&x<=canvas.width&&y>=0&&y<=canvas.height)
        .sort((a,b)=>a.q.stars-b.q.stars);
      if(!visible.length)throw new Error('No reachable NPC camp visible in the live map viewport');
      const {q,x,y}=visible[0];
      return {key:q.key,x:q.x,y:q.y,stars:q.stars,
        click:{x:rect.left+x/canvas.width*rect.width,y:rect.top+y/canvas.height*rect.height}};
    }""")
    page.mouse.click(npc['click']['x'],npc['click']['y'])
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
    # Explicit UI fixture: test the real click path with a supplied shard wallet.
    page.set_viewport_size({'width':1280,'height':720})
    page.locator('[data-action="tab"][data-tab="relics"]').first.click()
    check('HG29 crafting cards shown before HG27 old exchange panel',page.evaluate("""()=>{
      const html=document.querySelector('#game-modal-body')?.innerHTML||'';
      return html.indexOf('hg29-craft')>=0&&html.indexOf('hg29-craft')<html.indexOf('hg27-exchange');
    }"""))
    page.evaluate("""()=>{
      const s=HOG_APP_DEBUG.getState();
      s.hg29.shards.wild=12;s.hg29.shards.gear=12;
      HOG_APP_DEBUG.render();
    }""")
    page.locator('[data-action="hg29-craft"][data-id="stone"]').first.click()
    check('Actual button crafts 2 stones and deducts 8 wild/6 gear',page.evaluate("""()=>{
      const s=HOG_APP_DEBUG.getState();
      return s.hg29.shards.wild===4&&s.hg29.shards.gear===6&&
        s.hg18.materials.enhance_stone===2&&s.hg29.crafted===1&&HOG_ENGINE.strictSave(s);
    }"""))
    shot(page,'fixture-stone-craft-1280x720.png')
    page.reload(wait_until='load')
    check('Cold browser reload preserves crafted output, no duplicate',page.evaluate("""()=>{
      const s=HOG_APP_DEBUG.getState();
      return s.hg29.shards.wild===4&&s.hg29.shards.gear===6&&
        s.hg18.materials.enhance_stone===2&&s.hg29.crafted===1&&HOG_ENGINE.strictSave(s);
    }"""))
    check('Zero uncaught JS errors',not errors)
    browser.close()
receipt={'pass':all(q['pass'] for q in checks),'checks':checks,'errors':errors,'screens':screens}
(ROOT/'docs'/'qa'/'hg29-ui.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
print('HG29 UI '+str(sum(q['pass'] for q in checks))+'/'+str(len(checks))+' PASS',flush=True)
