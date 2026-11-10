"""HG49 Celestial Spectrum acceptance: actual one-file Chromium, 4 races and
screens, 10-slot mobile regression, receipt-based battle Canvas VFX.
No test fixture is reported as earned loot. Keeps Save v07 canonical.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib,json,atexit,sys
ROOT=Path(__file__).resolve().parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
OUT=ROOT/'docs/evidence/hg49';OUT.mkdir(parents=True,exist_ok=True)
QA=ROOT/'docs/qa/hg49';QA.mkdir(parents=True,exist_ok=True)
CHECKS=[];SHOTS=[];ERRORS=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8',errors='replace')
def check(name,condition,detail=None):
    ok=bool(condition);CHECKS.append({'name':name,'pass':ok,'detail':detail})
    print(('HG49 PASS ' if ok else 'HG49 FAIL ')+name,flush=True)
    if not ok:raise AssertionError(name+' '+str(detail)[:350])
def shot(page,name):
    file=OUT/name;page.screenshot(path=str(file),animations='disabled',full_page=False)
    SHOTS.append({'path':str(file.relative_to(ROOT)),'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
def evidence():
    report={'gate':'HG49 Celestial Spectrum offline-HTML actual browser',
        'pass':sum(x['pass'] for x in CHECKS),'total':len(CHECKS),
        'checks':CHECKS,'screenshots':SHOTS,'errors':ERRORS}
    (QA/'spectrum-chromium.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
atexit.register(evidence)
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    sizes=[('desktop-1280x720',1280,720,False,'human'),
           ('phone-844x390',844,390,True,'elf'),
           ('phone-768x260',768,260,True,'orc'),
           ('phone-412x915',412,915,True,'undead')]
    for name,w,h,mobile,race in sizes:
        ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile,device_scale_factor=1)
        page=ctx.new_page();page.set_default_timeout(16000)
        page.on('pageerror',lambda err,n=name:ERRORS.append({'viewport':n,'error':str(err)}))
        page.goto(HTML.as_uri(),wait_until='load')
        page.locator('[data-action="race"][data-race="'+race+'"]').click()
        page.locator('[data-action="start"]').click()
        branding=page.evaluate("""() => {
            const s=HOG_APP_DEBUG.getState(),style=getComputedStyle(document.documentElement),
                nav=document.querySelector('#nav button');
            return {race:s.race,body:document.body.dataset.hg49Race,
                v:s.version,save:HOG_ENGINE.strictSave(s),
                cyan:style.getPropertyValue('--hg49-cyan').trim(),
                raceColor:getComputedStyle(document.body).getPropertyValue('--hg49-race').trim(),
                navBackground:getComputedStyle(nav).backgroundImage,
                painter:typeof HOG_PAINTER.motionImpactFx,
                width:document.documentElement.scrollWidth};
        }""")
        check(name+' actual faction skin bound to Save race',
            branding['race']==race and branding['body']==race,branding)
        check(name+' cyan/gold/violet design system loaded',
            branding['cyan']=='#57deff' and branding['raceColor'].startswith('#') and 'gradient' in branding['navBackground'],branding)
        check(name+' strict Save v07 and real painter active',
            branding['v']==7 and branding['save'] and branding['painter']=='function')
        check(name+' document fits width',branding['width']<=w+2,branding['width'])
        if not mobile:
            shot(page,'desktop-world-map.png')
            page.locator('[data-action="tab"][data-tab="city"]').first.click()
            check('desktop city screen has actual canvas',
                page.locator('#city-canvas').count()==1)
            shot(page,'desktop-city.png')
        page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
        page.locator('[data-action="hg408-tab"][data-id="gear"]').click()
        gear=page.evaluate("""() => {
            const slots=[...document.querySelectorAll('.hg47-ten-slots .hg46-slot')],
             panel=document.querySelector('.hg408-panel'),rect=panel.getBoundingClientRect();
            return {count:slots.length,visible:slots.filter(el=>{
              const r=el.getBoundingClientRect();
              return r.x>=rect.x-2&&r.right<=rect.right+2&&r.y>=rect.y-2&&r.bottom<=rect.bottom+2
            }).length,windowBackground:getComputedStyle(document.querySelector('.game-window')).backgroundImage,
             width:document.documentElement.scrollWidth};
        }""")
        check(name+' all ten gear slots visible',gear['count']==10 and gear['visible']==10,gear)
        check(name+' chromatic hero window rendered', 'gradient' in gear['windowBackground'] and gear['width']<=w+2,gear)
        shot(page,name+'-hero.png')
        page.locator('[data-action="tab"][data-tab="relics"]').first.click()
        forge=page.evaluate("""() => ({
           recipes:document.querySelectorAll('.hg47-recipe').length,
           border:getComputedStyle(document.querySelector('.hg47-recipe')).borderColor,
           actual:HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState()),
           canCraft:[...document.querySelectorAll('[data-action="hg47-craft"]')].filter(e=>!e.disabled).length
        })""")
        check(name+' 10 real forge recipes, no free crafting and strict Save',
              forge['recipes']==10 and forge['canCraft']==0 and forge['actual'],forge)
        shot(page,name+'-forge.png')
        if not mobile:
            # Source-driven battle visual smoke test. Fight a real world NPC
            # with actual armies; never grant items or construct forged receipts.
            battle=page.evaluate("""() => {
              const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
              E.autoFormation(s);
              const home=E.getTile(E.activeCity(s).key),target=E.TILES.filter(t=>t.kind==='npc'&&t.level===1).sort((a,b)=>
               Math.abs(a.x-home.x)+Math.abs(a.y-home.y)-Math.abs(b.x-home.x)-Math.abs(b.y-home.y))[0];
              if(!target)return {error:'missing world NPC'};
              E.startMarch(s,target.key);let ticks=0;
              while(s.march&&ticks++<18)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+2)/s.speed*1000));
              if(!s.battle)return {error:'no real world battle'};
              HOG_APP_DEBUG.render();
              const P=HOG_PAINTER,b=s.battle;
              const c=document.getElementById('battle-canvas');
              if(!c)return {error:'no combat canvas'};
              let turn=0,hasHit=false;
              while(s.battle===b&&turn++<5){
               E.battleAct(s,'attack');
               const timeline=P.battleTimelineFor(b,performance.now());
               if(timeline?.items?.some(t=>t.event.damage>0)){hasHit=true;break;}
              }
              const live=E.strictSave(s);
              const timeline=P.battleTimelineFor(b,performance.now());
              const receipt=timeline?.items?.find(t=>t.event.damage>0);
              if(receipt){P.drawBattle(c,E,{...s,battle:b},receipt.impactAt+110);}
              return {target:target.key,hasHit,turns:turn,valid:live,
               receipt:!!receipt,vfx:typeof P.motionImpactFx,canvas:c.width+'x'+c.height};
            }""")
            check('desktop combat VFX uses authentic hit receipts',battle.get('hasHit') and battle.get('receipt') and battle.get('vfx')=='function',battle)
            check('desktop battle remains strict Save v07 and responsive Canvas has valid pixel size',
                battle.get('valid') and len(battle.get('canvas','').split('x'))==2 and
                all(200<=int(v)<=4096 for v in battle['canvas'].split('x')),battle)
            shot(page,'desktop-combat-vfx.png')
        check(name+' no uncaught browser errors',not [e for e in ERRORS if e['viewport']==name],ERRORS)
        ctx.close()
    browser.close()
print('HG49 CHROMIUM '+str(sum(x['pass'] for x in CHECKS))+'/'+str(len(CHECKS)),flush=True)
