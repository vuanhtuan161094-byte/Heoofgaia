"""HG81 actual one-HTML Chromium hero tree, conversion, retirement and XP."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,hashlib,atexit,sys
ROOT=Path(__file__).parent;HTML=ROOT/'Play-Heoofgaia-HG11.html'
ART=ROOT/'docs/evidence/hg81';QA=ROOT/'docs/qa/hg81'
ART.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];shots=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8',errors='replace')
def check(name,ok,data=None):
    checks.append({'check':name,'pass':bool(ok),'evidence':data})
    print('HG81 CHROME '+('PASS ' if ok else 'FAIL ')+name+' '+str(data)[:220],flush=True)
    if not ok:raise AssertionError(name+' '+str(data))
def capture(page,name):
    f=ART/(name+'.png');page.screenshot(path=str(f),animations='disabled')
    shots.append({'name':name,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
@atexit.register
def receipt():
    (QA/'heroes-chrome.json').write_text(json.dumps({'passed':sum(x['pass'] for x in checks),
      'total':len(checks),'checks':checks,'errors':errors,'screenshots':shots,
      'fileSha256':hashlib.sha256(HTML.read_bytes()).hexdigest() if HTML.exists() else None,
      'hardware':'Chromium emulated touch; physical Android/PC still pending'},
      indent=2,ensure_ascii=False),encoding='utf-8')
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    for label,w,h,mobile in [('desktop-1280x720',1280,720,False),
                              ('android-844x390',844,390,True),('android-412x915',412,915,True)]:
        ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=mobile,is_mobile=mobile,
                                device_scale_factor=2 if mobile else 1)
        page=ctx.new_page();page.set_default_timeout(22000)
        page.on('pageerror',lambda e,tag=label:errors.append({'viewport':tag,'error':str(e)}))
        page.goto(HTML.as_uri(),wait_until='load',timeout=120000)
        page.locator('[data-action="start"]').click()
        page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
        check(label+' six functional hero tabs',page.locator('.hg408-tabs button').count()==6)
        check(label+' fast strip buttons visibly presented',
              all(page.locator('[data-action="hg81-strip"][data-mode="'+m+'"]').count()==1
                  for m in ['gear','army','all']))
        page.locator('[data-action="hg408-tab"][data-id="skills"]').click()
        check(label+' four exclusive troop skill branches rendered',
              page.locator('.hg81-node').count()==4)
        setup=page.evaluate("""() => {
          const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
          s.hg81.credits[s.activeHero]=3;
          const original=JSON.stringify(s.army);
          const available=E.hg81SkillStatus(s,s.activeHero).available;
          HOG_APP_DEBUG.render();
          return {version:s.version,valid:E.strictSave(s),originalArmy:original,available,
                  price:E.hg81XpStatus(s).price,ratio:E.heroQualityChances(10).slice(5)};
        }""")
        check(label+' new-game v07 rarity 10%/10% skill credits',
              setup['valid'] and setup['version']==7 and setup['available']==3 and setup['ratio']==[10,10],setup)
        page.locator('[data-action="hg81-skill-up"][data-skill="archery"]').click()
        upgraded=page.evaluate("""() => {
            const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),r=E.hg81SkillStatus(s,s.activeHero);
            return {level:r.nodes.find(t=>t.id==='archery').level,remaining:r.available,valid:E.strictSave(s)};
        }""")
        check(label+' real skill click spent exactly one point',upgraded['level']==1 and
              upgraded['remaining']==2 and upgraded['valid'],upgraded)
        cards=page.evaluate("""() => {
          const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
          s.res.gold=Math.max(s.res.gold,25000);
          HOG_APP_DEBUG.render();
          return {valid:E.strictSave(s),cards:E.hg81XpStatus(s).cards};
        }""")
        check(label+' genuine paid XP card affordability',cards['valid'] and cards['cards']==0,cards)
        page.locator('[data-action="hg81-buy-card"]').click()
        page.locator('[data-action="hg81-use-card"]').click()
        xp=page.evaluate("""() => {
          const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
          const before=E.hg81XpStatus(s),exp=E.grantHeroExperience(s,s.activeHero,600,'thắng trận 4★'),
                after=E.hg81XpStatus(s);
          return {b:before.activeUses,a:after.activeUses,exp:exp.gained,save:E.strictSave(s)};
        }""")
        check(label+' paid x2 EXP consumes only one earned win charge',
              xp['b']==8 and xp['a']==7 and xp['exp']>1200 and xp['save'],xp)
        capture(page,label+'-hero-talents')
        # All dummy fixtures are created inside temporary browser state; none
        # are shipped in the offline HTML. Real clicks still use the app UI.
        fresh=page.evaluate("""() => {
          const E=HOG_ENGINE,A=HOG_APP_DEBUG;A.resetForTests();
          const s=A.getState(),source=s.heroes[0],h=JSON.parse(JSON.stringify(source));
          h.id=2;h.name='HG81 Fixture';s.heroes.push(h);s.equipment[h.id]={};
          E.hg81Ensure(s);
          const gear=E.addItem(s,'star_blade','HG81 browser fixture');
          E.equipItem(s,gear.uid,2);E.hg20SetHeroPlan(s,2,[{unitId:'human_1',count:3}]);
          A.render();
          return {valid:E.strictSave(s),uid:gear.uid,hero:2,
            stock:s.army.human_1,inventory:s.inventory.length};
        }""")
        check(label+' strict fixture with a real gear UID and reserved troops',fresh['valid'],fresh)
        page.locator('[data-action="hg408-inspect"][data-id="2"]').click()
        page.locator('[data-action="hg81-strip"][data-mode="all"]').click()
        strip=page.evaluate("""() => {
          const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
          return {gear:Object.keys(s.equipment[2]||{}).length,
            plans:E.hg20HeroPlan(s,2).length,inventory:s.inventory.length,
            stock:s.army.human_1,valid:E.strictSave(s)};
        }""")
        check(label+' quick demobilize releases all ten gear slots without losing items or soldiers',
              strip['gear']==0 and strip['plans']==0 and strip['inventory']==fresh['inventory'] and
              strip['stock']==fresh['stock'] and strip['valid'],strip)
        capture(page,label+'-quick-dismiss')
        ctx.close()
    browser.close()
check('zero uncaught Chromium JavaScript errors',not errors,errors)
print('HG81 CHROME SUMMARY',sum(q['pass'] for q in checks),'/',len(checks),flush=True)
