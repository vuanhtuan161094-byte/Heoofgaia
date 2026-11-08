"""HG40.5: actual single-file offline PC and touch-phone viewport acceptance.

Chromium is run with real touch event dispatch on mobile emulation. This is
NOT a physical iPhone/Android device acceptance test and does NOT fake a game.
"""
from pathlib import Path
import hashlib
import json
import os
import sys
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
DIR=ROOT/'docs/qa/hg405'
ART=ROOT/'docs/evidence/hg405'
DIR.mkdir(parents=True,exist_ok=True)
ART.mkdir(parents=True,exist_ok=True)
checks=[];captures=[];page_errors=[]
if hasattr(sys.stdout,'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8',errors='replace')

def check(name,condition,data=None):
    ok=bool(condition)
    checks.append({'name':name,'pass':ok,'data':data})
    print(('PASS' if ok else 'FAIL')+' HG40.5 '+name+' '+json.dumps(data,ensure_ascii=False)[:220] if data is not None else
          ('PASS' if ok else 'FAIL')+' HG40.5 '+name,flush=True)
    if not ok:raise AssertionError(name+' '+repr(data))

with sync_playwright() as playwright:
    launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']}
    if os.environ.get('HOG_CHROME_PATH'):
        launch['executable_path']=os.environ['HOG_CHROME_PATH']
    browser=playwright.chromium.launch(**launch)
    for label,w,h,mobile in [('pc-1280x720',1280,720,False),('phone-landscape-844x390',844,390,True),
                              ('phone-chrome-768x260',768,260,True),('phone-portrait-412x915',412,915,True)]:
        context=browser.new_context(viewport={'width':w,'height':h},is_mobile=mobile,
                                    has_touch=mobile,device_scale_factor=2 if mobile else 1)
        page=context.new_page()
        page.set_default_timeout(18000)
        page.on('pageerror',lambda e,origin=label:page_errors.append({'screen':origin,'message':str(e)}))
        page.goto(HTML.as_uri(),wait_until='load',timeout=35000)
        page.locator('[data-action="start"]').click()
        data=page.evaluate("""() => {
          const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),
           c=document.querySelector('#world-canvas'),r=c?.getBoundingClientRect(),
           u=E.getUnit(s,'human_1'),
           t=E.recruitDuration(s,u,1000);
          return {save:s.version,valid:E.strictSave(s),speed:E.HG39_CONFIG.recruitSpeedMultiplier,
            queueGameSeconds:t,backing:c?{w:c.width,h:c.height}:null,
            guideInRail:!!document.querySelector('.hg39-map-dock [aria-label="Lộ trình phát triển New Game"]'),
            bodyW:document.documentElement.scrollWidth,
            innerW:innerWidth,innerH:innerHeight,
            map:r?{x:r.x,y:r.y,w:r.width,h:r.height}:null,
            mapTouchAction:c?getComputedStyle(c).touchAction:null,
            coarse:matchMedia('(pointer:coarse)').matches,
            buttons:[...document.querySelectorAll('#nav button')].length};
        }""")
        check(label+' New Game is valid v07, 5000x training and map visible',
              data['save']==7 and data['valid'] and data['speed']==5000 and
              data['queueGameSeconds']>=1 and data['map'] and data['map']['w']>195 and
              data['buttons']>=5,data)
        # Mobile world map must actually be playable; 99px was formally
        # interactive but too shallow for meaningful hex map navigation.
        min_map_height=(160 if label=='phone-chrome-768x260' else
                        225 if label=='phone-landscape-844x390' else
                        170 if mobile else 250)
        check(label+' keeps enough world-map HEIGHT to navigate visually',
              data['map'] and data['map']['h']>=min_map_height,
              {'map':data['map'],'minHeight':min_map_height})
        check(label+' has no horizontal page overflow',
              data['bodyW']<=data['innerW']+2,
              {'bodyW':data['bodyW'],'viewportW':data['innerW']})
        if label in ('phone-chrome-768x260','phone-landscape-844x390'):
            check(label+' onboarding checklist is retained in collapsible rail, not blocking Canvas',
                  data['guideInRail'],{'movedIntoRail':data['guideInRail']})
            check(label+' Canvas backing resolution matches final visible flex geometry',
                  abs(data['map']['w']-data['backing']['w'])<=3 and
                  abs(data['map']['h']-data['backing']['h'])<=3,
                  {'backing':data['backing'],'css':data['map']})
            initial=page.evaluate("""() => {
              const map=document.querySelector('#world-canvas').getBoundingClientRect();
              return {width:map.width,height:map.height,
                rail:getComputedStyle(document.querySelector('.hg39-map-dock')).display};
            }""")
            page.locator('[data-action="map-expand"]').click()
            expanded=page.evaluate("""() => {
              const map=document.querySelector('#world-canvas').getBoundingClientRect();
              return {width:map.width,height:map.height,
                rail:getComputedStyle(document.querySelector('.hg39-map-dock')).display,
                expanded:document.body.classList.contains('hg40-map-expanded')};
            }""")
            check(label+' one-tap fullscreen expands playable map and hides rail',
                  expanded['expanded'] and expanded['rail']=='none' and
                  expanded['width']>=initial['width']+110 and
                  expanded['height']>=initial['height']-3,
                  {'before':initial,'expanded':expanded})
            page.locator('[data-action="map-expand"]').click()
            restored=page.evaluate("""() => ({
              expanded:document.body.classList.contains('hg40-map-expanded'),
              rail:getComputedStyle(document.querySelector('.hg39-map-dock')).display,
              guide:!!document.querySelector('.hg39-map-dock [aria-label="Lộ trình phát triển New Game"]')
            })""")
            check(label+' fullscreen toggle restores map commands and tutorial',
                  not restored['expanded'] and restored['rail']!='none' and restored['guide'],restored)
        check(label+' world canvas preserves touch pan without stealing other gestures',
              data['mapTouchAction']=='none',data['mapTouchAction'])
        if mobile:
            before=page.evaluate("({x:HOG_PAINTER.mapCamera().centerX,y:HOG_PAINTER.mapCamera().centerY})")
            box=page.locator('#world-canvas').bounding_box()
            x=box['x']+box['width']*.47;y=box['y']+box['height']*.54
            session=context.new_cdp_session(page)
            session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
            for step in range(1,8):
                session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[
                    {'x':x+step*7,'y':y+step*3}]})
                page.wait_for_timeout(20)
            session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            after=page.evaluate("({x:HOG_PAINTER.mapCamera().centerX,y:HOG_PAINTER.mapCamera().centerY})")
            check(label+' real CDP touch drag pans canonical map camera',
                  abs(after['x']-before['x'])+abs(after['y']-before['y'])>.1,
                  {'before':before,'after':after})
        # A real tap opens Army management; no extra screen / server is needed.
        page.locator('[data-action="tab"][data-tab="army"]').first.click()
        quote=page.evaluate("""() => ({
          field:!!document.getElementById('q_human_1'),
          button:!!document.querySelector('[data-action="recruit"][data-id="human_1"]'),
          valid:HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState()),
          queueKind:typeof HOG_ENGINE.recruitDuration
        })""")
        check(label+' Army recruitment UI is actionable with no broken Save',
              quote['field'] and quote['button'] and quote['valid'] and
              quote['queueKind']=='function',quote)
        shot=ART/(label+'.png')
        page.screenshot(path=str(shot),animations='disabled')
        captures.append({'file':str(shot.relative_to(ROOT)),
                         'sha256':hashlib.sha256(shot.read_bytes()).hexdigest()})
        context.close()
    browser.close()
check('no uncaught JavaScript errors on desktop and both phone orientations',not page_errors,page_errors)
record={'schema':'HG40.5-Desktop-Mobile-Chromium-v1',
        'pass':all(x['pass'] for x in checks),'checks':checks,'screenshots':captures,
        'htmlSha256':hashlib.sha256(HTML.read_bytes()).hexdigest(),
        'hardwareScope':'Chromium device emulation; no Android APK, no iOS hardware or external website dependency'}
(DIR/'desktop-phone-chrome.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('HG40.5 DESKTOP + MOBILE CHROME',sum(x['pass'] for x in checks),'/',len(checks),
      'PASS' if record['pass'] else 'FAIL',flush=True)
