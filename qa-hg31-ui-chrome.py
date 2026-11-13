"""HG31 Playwright: 10 actual management screenshots and high-end paid crafting UI fixture.
Screenshots never replace actual engine state/Save acceptance.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
OUT=ROOT/'docs'/'evidence'/'hg31';OUT.mkdir(parents=True,exist_ok=True)
CHECK=[];SHOTS=[];ERRORS=[]
def check(name,ok):
 ok=bool(ok);CHECK.append({'name':name,'pass':ok})
 print(('PASS ' if ok else 'FAIL ')+name,flush=True)
 if not ok:raise AssertionError(name)
def shot(page,name):
 p=OUT/name;page.screenshot(path=str(p));SHOTS.append(str(p.relative_to(ROOT)))
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 page=browser.new_page(viewport={'width':1280,'height':720})
 page.on('pageerror',lambda error:ERRORS.append(str(error)))
 page.goto((ROOT/'Play-Heoofgaia-HG11.html').as_uri(),wait_until='load')
 check('New Game available',page.locator('[data-action="start"]').is_visible())
 page.locator('[data-action="start"]').click()
 check('New Game HG31 six empty fragment wallets and strict Save v07',page.evaluate("""()=>{
  let s=HOG_APP_DEBUG.getState();return s.version===7&&HOG_ENGINE.strictSave(s)&&
  Object.values(s.hg31.fragments).every(n=>n===0)&&s.hg31.bossWins===0;
 }"""))
 tabs=['map','city','army','heroes','magic','relics','tasks','tower','reports','sources']
 for i,tab in enumerate(tabs,1):
  page.locator(f'[data-action="tab"][data-tab="{tab}"]').first.click()
  if tab=='relics':
   check('HG31 renders six actual selectable item recipes',page.locator('.hg31-card').count()==6)
   check('Item arts SVG are visible in six cards',page.locator('.hg31-card img.hg31-icon').count()==6)
  if tab=='tasks':check('HG31 targeted Boss and Tower preview present',page.locator('.hg31-guide-row>div').count()==2)
  shot(page,f'{i:02d}-{tab}-newgame-1280x720.png')
 for tab in ['map','heroes','relics','tasks','tower']:
  page.set_viewport_size({'width':960,'height':540})
  page.locator(f'[data-action="tab"][data-tab="{tab}"]').first.click()
  shot(page,f'{tab}-960x540.png')
 page.set_viewport_size({'width':1280,'height':720})
 page.locator('[data-action="tab"][data-tab="relics"]').first.click()
 # HIGH-RESOURCE QA FIXTURE (not earned New Game economy). Actual UI still performs full transaction.
 page.evaluate("""()=>{
  const s=HOG_APP_DEBUG.getState();s.hg31.bossWins=4;s.hg31.paidTowerWins=4;
  s.hg20.tower.floor=21;s.res.gold+=300000;
  for(const id in s.hg31.fragments)s.hg31.fragments[id]=30;
  for(const id in s.hg29.shards)s.hg29.shards[id]=100;
  s.hg27.boss=50;HOG_APP_DEBUG.render();
 }""")
 shot(page,'fixture-01-targets-ready-1280x720.png')
 page.locator('[data-action="hg31-focus"][data-id="dragon_plate"]').first.click()
 check('Focus button changes stored Boss target',page.evaluate("""()=>{
  const s=HOG_APP_DEBUG.getState();return s.hg31.bossFocus==='dragon_plate'&&HOG_ENGINE.strictSave(s);
 }"""))
 shot(page,'fixture-02-boss-target-chosen-1280x720.png')
 for id in ['dragon_blade','dragon_plate','dragon_seal']:
  page.locator(f'[data-action="hg31-craft"][data-id="{id}"]').first.click()
 check('Three Dragon items crafted with six dedicated shard deductions each',page.evaluate("""()=>{
  const s=HOG_APP_DEBUG.getState();return s.hg31.crafted===3&&
  ['dragon_blade','dragon_plate','dragon_seal'].every(id=>s.inventory.some(x=>x.itemId===id)&&s.hg31.fragments[id]===24)
   &&HOG_ENGINE.strictSave(s);
 }"""))
 shot(page,'fixture-03-dragon-set-crafted-1280x720.png')
 for id in ['star_blade','star_plate','star_seal']:
  page.locator(f'[data-action="hg31-craft"][data-id="{id}"]').first.click()
 check('Three Star items crafted, real inventory and fragment sink',page.evaluate("""()=>{
  const s=HOG_APP_DEBUG.getState();return s.hg31.crafted===6&&
  ['star_blade','star_plate','star_seal'].every(id=>s.inventory.some(x=>x.itemId===id)&&s.hg31.fragments[id]===21)
   &&HOG_ENGINE.strictSave(s);
 }"""))
 shot(page,'fixture-04-star-set-crafted-1280x720.png')
 page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
 page.locator('[data-action="hg408-tab"][data-id="gear"]').click()
 for id in ['star_blade','star_plate','star_seal']:
  uid=page.evaluate("""(id)=>{
    const s=HOG_APP_DEBUG.getState();return s.inventory.find(x=>x.itemId===id).uid;
  }""",id)
  page.locator(f'.hg46-inventory-card[data-hg46-uid="{uid}"]').click()
  page.locator(f'.hg83-inspector [data-action="hg408-equip"][data-uid="{uid}"]').click()
 check('Native three-piece Star set activates 8% damage and 8.5% reduction',page.evaluate("""()=>{
  const s=HOG_APP_DEBUG.getState(),mods=HOG_ENGINE.combatModifiers(s,s.activeHero);
  return HOG_ENGINE.hg18SetCounts(s,s.activeHero).star===3&&mods.damageBonus>=.079&&
    mods.damageReduction>=.084&&HOG_ENGINE.strictSave(s);
 }"""))
 shot(page,'fixture-05-star-set-equipped-1280x720.png')
 page.reload(wait_until='load')
 check('Cold reload preserves six crafted gear, set effects and focus without duplicates',page.evaluate("""()=>{
  const s=HOG_APP_DEBUG.getState(),mods=HOG_ENGINE.combatModifiers(s,s.activeHero);
  return s.hg31.crafted===6&&s.hg31.bossFocus==='dragon_plate'&&
   s.inventory.filter(x=>HOG_ENGINE.ITEMS[x.itemId]?.hg31).length===6&&
   HOG_ENGINE.hg18SetCounts(s,s.activeHero).star===3&&mods.damageBonus>=.079&&
   HOG_ENGINE.strictSave(s);
 }"""))
 page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
 shot(page,'fixture-06-after-cold-reload-1280x720.png')
 check('No uncaught JS errors',not ERRORS)
 browser.close()
receipt={'pass':all(x['pass'] for x in CHECK),'checks':CHECK,'screenshots':SHOTS,'errors':ERRORS}
(ROOT/'docs'/'qa'/'hg31-ui.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf8')
print(f"HG31 UI {sum(x['pass'] for x in CHECK)}/{len(CHECK)} PASS",flush=True)
