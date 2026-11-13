"""HG87 real offline Chromium: inspect/compare, UID lock and favorites, atomic
50-item salvage rules and paid Epic forge on desktop and mobile landscape.
Item/shard seeding is an EXPLICIT QA fixture, never a player-facing reward.
"""
from pathlib import Path
import json,hashlib,atexit
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
OUT=ROOT/'docs/evidence/hg87';OUT.mkdir(parents=True,exist_ok=True)
REPORT=ROOT/'docs/qa/hg87/equipment-ui.json';REPORT.parent.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];images=[]
def check(label,cond,more=None):
    okay=bool(cond)
    checks.append({'label':label,'pass':okay})
    print(('HG87 PASS ' if okay else 'HG87 FAIL ')+label+' '+str(more or '')[:220],flush=True)
    if not okay:raise AssertionError(label+' '+str(more)[:900])
def shot(page,name):
    f=OUT/(name+'.png');page.screenshot(path=str(f),animations='disabled')
    images.append({'name':str(f.relative_to(ROOT)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
@atexit.register
def report():
    REPORT.write_text(json.dumps({'checks':checks,'passed':sum(x['pass'] for x in checks),
     'total':len(checks),'success':all(x['pass'] for x in checks),
     'images':images,'errors':errors,'offline_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest() if HTML.exists() else None},
     ensure_ascii=False,indent=2),encoding='utf8')
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    for mode,w,h,mobile in [('desktop',1280,720,False),('mobile',844,390,True)]:
      for race in ['human','elf','orc','undead']:
        context=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile)
        page=context.new_page();page.set_default_timeout(25000)
        page.on('pageerror',lambda e,mode=mode,race=race:errors.append(mode+' '+race+' '+str(e)))
        page.goto(HTML.as_uri(),wait_until='load',timeout=180000)
        if race!='human':page.locator(f'[data-action="race"][data-race="{race}"]').click()
        page.locator('[data-action="start"]').click()
        seed=page.evaluate("""race=>{
         const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
         const old=E.addItem(s,'copper_blade','HG87 fixture: equipped old weapon');
         const loose=E.addItem(s,'copper_blade','HG87 fixture: loose common');
         const loved=E.addItem(s,'copper_blade','HG87 fixture: favorite');
         const epic=E.addItem(s,E.hg87ItemId(race,'weapon'),'HG87 fixture: Epic');
         E.equipItem(s,old.uid,1);
         s.hg31.paidTowerWins=1;s.res.gold=100000;
         for(const k of ['gear','hunter','tower'])s.hg29.shards[k]=100;
         HOG_APP_DEBUG.render();
         return {old:old.uid,loose:loose.uid,loved:loved.uid,epic:epic.uid,
          valid:E.strictSave(s),n:s.inventory.length};
        }""",race)
        check(mode+' '+race+' real canonical fixture without free rewards',seed['valid'] and seed['n']==4,seed)
        page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
        page.locator('[data-action="hg408-tab"][data-id="gear"]').click()
        page.locator(f'.hg83-inventory-tile[data-hg46-uid="{seed["epic"]}"]').click()
        compare=page.evaluate("""()=>{
          const e=document.querySelector('.hg87-compare');
          return {shown:!!e,txt:e?.textContent||'',images:document.querySelectorAll('.hg83-inventory-tile .hg86-rendered-gear-img').length,
            inspector:document.querySelectorAll('.hg83-inspector').length};
        }""")
        check(mode+' '+race+' real rendered equipment shows live stat comparison',compare['shown'] and
          'ATK' in compare['txt'] and 'DEF' in compare['txt'] and compare['images']==4 and
          compare['inspector']==1,compare)
        page.locator('.hg83-inspector [data-action="hg87-mark"][data-field="locked"]').click()
        protection=page.evaluate("""uid=>{
          const s=HOG_APP_DEBUG.getState();return {
           locked:HOG_ENGINE.hg87Flag(s,uid).locked,
           badge:!!document.querySelector('.hg83-inventory-tile[data-hg46-uid="'+uid+'"] .hg87-tile-locked'),
           disabled:document.querySelector('.hg83-inspector [data-action="hg46-salvage"]')?.disabled,
           valid:HOG_ENGINE.strictSave(s)};
        }""",seed['epic'])
        check(mode+' '+race+' lock prevents accidental salvage with clear badge',protection['locked'] and
          protection['badge'] and protection['disabled'] and protection['valid'],protection)
        page.locator(f'.hg83-inventory-tile[data-hg46-uid="{seed["loved"]}"]').click()
        page.locator('.hg83-inspector [data-action="hg87-mark"][data-field="favorite"]').click()
        check(mode+' '+race+' favorite icon is persisted on one real UID',page.evaluate("""uid=>{
         const s=HOG_APP_DEBUG.getState();return HOG_ENGINE.hg87Flag(s,uid).favorite&&
          !!document.querySelector('.hg83-inventory-tile[data-hg46-uid="'+uid+'"] .hg87-tile-favorite');
        }""",seed['loved']))
        shot(page,mode+'-'+race+'-gear-with-protection')
        page.locator('[data-action="hg46-filter"][data-slot="locked"]').click()
        check(mode+' '+race+' lock filter shows only locked UID',page.locator('.hg83-inventory-tile').count()==1)
        page.locator('[data-action="hg46-filter"][data-slot="all"]').click()
        page.locator('[data-action="hg46-sort"][data-id="defense"]').click()
        check(mode+' '+race+' defense sorting preserves compact tiles',page.locator('.hg83-inventory-tile').count()==4)
        quote=page.evaluate("""()=>{
         const s=HOG_APP_DEBUG.getState(),q=HOG_ENGINE.hg87BatchPreview(s,'fine');
         return {count:q.count,stones:q.stones,uids:q.uids,canRun:q.canRun,save:HOG_ENGINE.strictSave(s)};
        }""")
        check(mode+' '+race+' bulk preview excludes worn, locked, favorite',quote['count']==1 and
          quote['uids']==[seed['loose']] and quote['canRun'] and quote['save'],quote)
        page.once('dialog',lambda d:d.accept())
        page.locator('[data-action="hg87-batch-salvage"]').click()
        after=page.evaluate("""()=>{
         const s=HOG_APP_DEBUG.getState();return {n:s.inventory.length,stones:s.hg18.materials.enhance_stone,
          valid:HOG_ENGINE.strictSave(s),locks:s.inventory.filter(x=>x.hg87Locked).length,
          fav:s.inventory.filter(x=>x.hg87Favorite).length};
        }""")
        check(mode+' '+race+' only one expendable UID removed with earned stone',after['n']==3 and
          after['stones']==1 and after['locks']==1 and after['fav']==1 and after['valid'],after)
        page.locator('[data-action="tab"][data-tab="relics"]').first.click()
        page.locator('details.hg87-forge > summary').click()
        recipe='hg87_'+race+'_armor'
        check(mode+' '+race+' eligible Epic forge is a real clickable recipe',page.locator(f'[data-hg87-recipe="{recipe}"] [data-action="hg87-craft"]:not([disabled])').count()==1)
        # Measure the canonical spend call, not net wallet delta at x60:
        # live production can credit gold between UI click and snapshot.
        page.evaluate("""() => {
          const E=HOG_ENGINE,old=E.spend;window.__hg88ForgePayments=[];
          E.spend=(s,c)=>{
            const before=s.res.gold,out=old(s,c);
            window.__hg88ForgePayments.push({goldBefore:before,goldAfter:s.res.gold,
              requested:c.gold||0,debited:before-s.res.gold});
            return out;
          };
        }""")
        before=page.evaluate("""()=>{const s=HOG_APP_DEBUG.getState();return {gold:s.res.gold,
          gear:s.hg29.shards.gear,hunter:s.hg29.shards.hunter,tower:s.hg29.shards.tower,n:s.inventory.length};}""")
        page.locator(f'[data-hg87-recipe="{recipe}"] [data-action="hg87-craft"]').click()
        crafted=page.evaluate("""id=>{
         const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),q=E.hg87Catalogue(s).find(x=>x.id===id);
         return {count:s.inventory.filter(x=>x.itemId===id).length,n:s.inventory.length,
           gold:s.res.gold,gear:s.hg29.shards.gear,hunter:s.hg29.shards.hunter,tower:s.hg29.shards.tower,
           cost:q.cost,valid:E.strictSave(s),
           payments:window.__hg88ForgePayments||[]};
        }""",recipe)
        check(mode+' '+race+' paid Epic craft yields exactly one UID and real resource costs',crafted['count']==1 and
          crafted['n']==before['n']+1 and len(crafted['payments'])==1 and
          crafted['payments'][0]['requested']==crafted['cost']['gold'] and
          abs(crafted['payments'][0]['debited']-crafted['cost']['gold'])<0.0001 and
          crafted['gold']>=before['gold']-crafted['cost']['gold']-0.0001 and
          crafted['gear']==before['gear']-crafted['cost']['gear'] and
          crafted['hunter']==before['hunter']-crafted['cost']['hunter'] and
          crafted['tower']==before['tower']-crafted['cost']['tower'] and crafted['valid'],crafted)
        check(mode+' '+race+' Epic forge stays OPEN after paid crafting so follow-up recipes stay usable',
          page.locator('details.hg87-forge[open] [data-hg87-recipe]').count()==10)
        shot(page,mode+'-'+race+'-epic-forge')
        page.evaluate('HOG_APP_DEBUG.save()')
        page.reload(wait_until='load',timeout=180000)
        cold=page.evaluate("""(ids)=>{
          const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();return {valid:E.strictSave(s),version:s.version,
           n:s.inventory.length,locked:E.hg87Flag(s,ids.epic).locked,
           favorite:E.hg87Flag(s,ids.loved).favorite};
        }""",seed)
        check(mode+' '+race+' cold Save v07 preserves UID locks, favorites, crafted gear',cold['valid'] and
          cold['version']==7 and cold['n']==4 and cold['locked'] and cold['favorite'],cold)
        context.close()
    browser.close()
check('No page/runtime errors across both viewports and four races',not errors,errors)
print('HG87 Chromium '+str(sum(x['pass'] for x in checks))+'/'+str(len(checks))+' PASS',flush=True)