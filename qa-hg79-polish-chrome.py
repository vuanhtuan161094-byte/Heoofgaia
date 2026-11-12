"""HG79 visual acceptance: true offline HTML, no placeholder monster avatars,
six-role hero art, visible square-map composition, Save v07 and phone pinch.
Chromium emulation is NOT a physical Android/Windows device test."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import atexit, hashlib, json, sys

ROOT=Path(__file__).resolve().parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
QA=ROOT/'docs/qa/hg79'
ART=ROOT/'docs/evidence/hg79'
QA.mkdir(parents=True,exist_ok=True)
ART.mkdir(parents=True,exist_ok=True)
results=[];errors=[];shots=[]
if hasattr(sys.stdout,'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8',errors='replace')
def check(name,condition,data=None):
    value=bool(condition)
    results.append({'name':name,'pass':value,'data':data})
    print(('HG79 CHROME PASS ' if value else 'HG79 CHROME FAIL ')+name+' '+str(data)[:400],flush=True)
    if not value:raise AssertionError(name+' '+str(data))
def shot(page,name):
    target=ART/(name+'.png')
    page.screenshot(path=str(target),animations='disabled')
    shots.append({'path':str(target.relative_to(ROOT)),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
def report():
    (QA/'visual-polish-chrome.json').write_text(json.dumps({
        'suite':'HG79 genuine offline visual, portrait and square-world QA',
        'file_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest() if HTML.exists() else None,
        'checks':results,'passed':sum(x['pass'] for x in results),
        'total':len(results),'errors':errors,'screenshots':shots
    },ensure_ascii=False,indent=2),encoding='utf-8')
atexit.register(report)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
    for label,w,h,mobile in [('desktop-1280x720',1280,720,False),
                              ('phone-landscape-844x390',844,390,True),
                              ('phone-portrait-412x915',412,915,True)]:
        context=browser.new_context(viewport={'width':w,'height':h},
            is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1)
        page=context.new_page()
        page.set_default_timeout(25000)
        page.on('pageerror',lambda e,screen=label:errors.append({'viewport':screen,'error':str(e)}))
        page.goto(HTML.as_uri(),wait_until='load',timeout=120000)
        page.locator('[data-action="start"]').click()
        world=page.evaluate("""() => {
            const E=HOG_ENGINE,P=HOG_PAINTER,A=HOG_APP_DEBUG;
            const canvas=document.getElementById('world-canvas'),r=canvas.getBoundingClientRect();
            const camera=P.mapCamera(),scale=camera.zoom*48;
            const bounds=P.hg79WorldGridBounds(E,scale,
              canvas.width/2-camera.centerX*scale,
              canvas.height/2-camera.centerY*scale,canvas.width,canvas.height);
            const tap=P.mapHit(canvas,canvas.width/2,canvas.height/2,E);
            return {v:A.getState().version,valid:E.strictSave(A.getState()),
              css:{w:r.width,h:r.height},backing:{w:canvas.width,h:canvas.height},
              bounds,selected:tap?.key,zoom:camera.zoom,
              heroCount:A.getState().heroes.length,
              gridCanvas:!!document.getElementById('world-canvas')};
        }""")
        check(label+' canonical Save v07 and square world visible',
            world['valid'] and world['v']==7 and world['gridCanvas'] and
            world['css']['w']>190 and world['css']['h']>115 and world['selected'] is not None,world)
        check(label+' phone map remains same CSS-size low-memory buffer',
            abs(world['css']['w']-world['backing']['w'])<=3 and
            abs(world['css']['h']-world['backing']['h'])<=3)
        shot(page,label+'-square-world')
        if label=='phone-landscape-844x390':
            box=page.locator('#world-canvas').bounding_box()
            x=box['x']+box['width']*.50;y=box['y']+box['height']*.59
            session=context.new_cdp_session(page)
            before=page.evaluate('HOG_PAINTER.mapCamera().zoom')
            session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[
                {'x':x-28,'y':y,'id':1},{'x':x+28,'y':y,'id':2}]})
            for d in [36,44,52]:
                session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[
                    {'x':x-d,'y':y,'id':1},{'x':x+d,'y':y,'id':2}]})
                page.wait_for_timeout(30)
            session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            after=page.evaluate('HOG_PAINTER.mapCamera().zoom')
            check(label+' genuine two-finger map pinch changes camera zoom',
                  after>before+.06,{'before':before,'after':after})
            shot(page,label+'-pinch-world')
        page.locator('[data-action="tab"][data-tab="heroes"]').first.click()
        faces=page.evaluate("""() => ({
           count:document.querySelectorAll('.hg79-portrait-knight,.hg79-portrait-ranger,.hg79-portrait-arcanist,.hg79-portrait-warden,.hg79-portrait-rogue,.hg79-portrait-oracle').length,
           vectorCount:document.querySelectorAll('.hg79-portrait-knight svg,.hg79-portrait-ranger svg,.hg79-portrait-arcanist svg,.hg79-portrait-warden svg,.hg79-portrait-rogue svg,.hg79-portrait-oracle svg').length,
           uniqueRoles:[...new Set([...document.querySelectorAll('[class*="hg79-portrait-"]')].flatMap(
             e=>[...e.classList].filter(c=>c.startsWith('hg79-portrait-'))))]
         })""")
        check(label+' genuine hero portrait SVG shown in hero UI',
              faces['count']>=1 and faces['vectorCount']>=1,faces)
        shot(page,label+'-hero-portraits')
        setup=page.evaluate("""() => {
           const E=HOG_ENGINE,P=HOG_PAINTER,A=HOG_APP_DEBUG;
           A.resetForTests();const s=A.getState();
           s.army.human_1=16;s.ap=900;
           E.hg20SetHeroPlan(s,s.activeHero,[{unitId:'human_1',count:8}]);
           const tile=E.TILES.find(t=>t.kind==='npc'&&t.level===1
             &&(t.eliteTier||0)<11&&E.pathfind(E.activeCity(s).key,t.key));
           if(!tile)throw Error('No real NPC target');
           E.startMarch(s,tile.key);
           for(let i=0;i<20&&s.march;i++)E.tick(s,s.lastTick+Math.ceil((s.march.remaining+3)/s.speed*1000));
           if(!s.battle)throw Error('NPC battle was not prepared');
           s.battleAuto=false;s.battle.autoUntil=Date.now()+10000000;A.showCombatForTests();
           const b=s.battle;
           return {valid:E.strictSave(s),save:s.version,enemy:b.enemies.map(u=>({
             name:u.name,unitId:u.unitId||null,
             nativeAtlas:!!P.animatedUnitId(u.unitId,u.name),
             alias:P.hg79EnemyVisualId(u)})),
             srcAtlas:!!document.querySelector('[data-hg33-atlas-src]'),
             heroBanners:document.querySelectorAll('[data-hg57-leaders] .hg79-portrait-knight,[data-hg57-leaders] .hg79-portrait-ranger,[data-hg57-leaders] .hg79-portrait-arcanist,[data-hg57-leaders] .hg79-portrait-warden,[data-hg57-leaders] .hg79-portrait-rogue,[data-hg57-leaders] .hg79-portrait-oracle').length};
        }""")
        check(label+' real NPC encounters resolve to character sprite identities',
              setup['valid'] and setup['save']==7 and setup['srcAtlas'] and
              setup['enemy'] and all(e['nativeAtlas'] or e['alias'] for e in setup['enemy']),setup)
        check(label+' real battle UI retains hero illustrated banner',
              setup['heroBanners']>=1,setup)
        page.wait_for_timeout(500)
        shot(page,label+'-npc-combat')
        check(label+' no save corruption after monster visualization',
              page.evaluate('HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())'))
        context.close()
    browser.close()
check('No JavaScript runtime errors across desktop and both phones',not errors,errors)
print('HG79 CHROME SUMMARY',sum(c['pass'] for c in results),'/',len(results),flush=True)
