"""HG39 real Chromium/file:// checks for the interactive world-map dock and dispatch flow."""
from pathlib import Path
import hashlib, json, os, sys
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
HTML=ROOT/'Play-Heoofgaia-HG11.html'
OUT=ROOT/'docs/qa/hg39'
SHOTS=ROOT/'docs/evidence/hg39'
OUT.mkdir(parents=True,exist_ok=True);SHOTS.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8')

def check(name,ok,evidence=None):
    ok=bool(ok);checks.append({'name':name,'pass':ok,'evidence':evidence})
    print(('PASS ' if ok else 'FAIL ')+name+((' '+json.dumps(evidence,ensure_ascii=False)[:350]) if evidence is not None else ''),flush=True)

launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']}
if os.environ.get('HOG_CHROME_PATH'):launch['executable_path']=os.environ['HOG_CHROME_PATH']
with sync_playwright() as pw:
    browser=pw.chromium.launch(**launch)
    page=browser.new_page(viewport={'width':1280,'height':720})
    page.set_default_timeout(20000)
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.goto(HTML.as_uri(),wait_until='load')
    page.locator('[data-action="start"]').click()
    fixture=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,P=HOG_PAINTER;
      const spare=JSON.parse(JSON.stringify(s.heroes[0]));spare.id=2;spare.name='Rhea';s.heroes.push(spare);
      s.army.human_1=28;s.army.human_2=8;E.setSpeed(s,1);
      E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:8}]);
      E.hg20SetHeroPlan(s,2,[{unitId:'human_1',count:5}]);
      E.setFormation(s,[{unitId:'human_1',count:8}]);
      const home=E.activeCity(s),target=E.NPC_CAMPS_2009.filter(q=>q.stars===1&&E.pathfind(home.key,q.key))
        .sort((a,b)=>E.pathfind(home.key,a.key).length-E.pathfind(home.key,b.key).length)[0];
      if(!target)throw new Error('No reachable one-star NPC for dispatch fixture');
      Object.assign(P.mapCamera(),{centerX:target.x,centerY:target.y,zoom:1.3});HOG_APP_DEBUG.render();
      return {key:target.key,x:target.x,y:target.y,name:target.value,home:home.key,
        path:E.pathfind(home.key,target.key),valid:E.strictSave(s),heroLimit:E.heroLimit(s.heroes[0].level)};
    }""")
    check('Seeded dispatch fixture is a valid Save v07 with a reachable real NPC',fixture['valid'] and len(fixture['path'])>1,fixture)

    def select_target_by_real_canvas_click():
        point=page.evaluate("""key => {
          const c=document.getElementById('world-canvas'),q=HOG_ENGINE.getTile(key),m=HOG_PAINTER.mapCamera();
          const scale=m.zoom*48,offX=c.width/2-m.centerX*scale,offY=c.height/2-m.centerY*scale;
          const x=offX+(q.x+.5)*scale,y=offY+(q.y+.5)*scale,r=c.getBoundingClientRect();
          return {x:r.left+x/c.width*r.width,y:r.top+y/c.height*r.height};
        }""",fixture['key'])
        page.mouse.click(point['x'],point['y'])
        return page.locator('.hg39-map-target .target-information h2').inner_text()

    selected_title=select_target_by_real_canvas_click()
    check('Canvas tap selects the real NPC target and opens its target card',
          (fixture['name'] and fixture['name'] in selected_title) or fixture['key'] in selected_title or
          f"({fixture['x']},{fixture['y']})" in selected_title.replace(' ',''),selected_title)
    for width,height,label in ((1280,720,'1280x720'),(960,540,'960x540'),(412,915,'phone-412x915')):
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(120)
        layout=page.evaluate("""() => {
          const q=s=>document.querySelector(s),r=e=>{const x=e.getBoundingClientRect();return {x:x.x,y:x.y,w:x.width,h:x.height,right:x.right,bottom:x.bottom}};
          const c=q('#world-canvas'),main=q('#main'),dock=q('.hg39-map-dock');
          return {viewport:{w:innerWidth,h:innerHeight},bodyWidth:document.documentElement.scrollWidth,
            canvas:r(c),main:r(main),dock:r(dock),mapVisible:!!c&&c.getBoundingClientRect().width>150,
            target: q('.hg39-map-target h2')?.textContent||null};
        }""")
        check(label+' map dock preserves visible interactive map with no horizontal overflow',
              layout['mapVisible'] and layout['bodyWidth']<=width+1 and layout['dock']['w']>150 and
              (width<=800 or layout['dock']['x']>=layout['main']['x']+layout['main']['w']-1),layout)
        page.screenshot(path=str(SHOTS/f'map-target-{label}.png'),animations='disabled')
        if label=='1280x720':
            zoom=page.evaluate('HOG_PAINTER.mapCamera().zoom')
            page.locator('[data-action="zoom"][data-dir="in"]').click()
            zoom_in=page.evaluate('HOG_PAINTER.mapCamera().zoom')
            page.locator('[data-action="zoom"][data-dir="out"]').click()
            zoom_out=page.evaluate('HOG_PAINTER.mapCamera().zoom')
            check('Map zoom controls change and restore the actual camera',zoom_in>zoom and abs(zoom_out-zoom)<.02,{'before':zoom,'in':zoom_in,'restored':zoom_out})
            before_pan=page.evaluate('({x:HOG_PAINTER.mapCamera().centerX,y:HOG_PAINTER.mapCamera().centerY})')
            rect=page.locator('#world-canvas').bounding_box();page.mouse.move(rect['x']+rect['width']*.54,rect['y']+rect['height']*.52);page.mouse.down();page.mouse.move(rect['x']+rect['width']*.60,rect['y']+rect['height']*.58,steps=5);page.mouse.up()
            after_pan=page.evaluate('({x:HOG_PAINTER.mapCamera().centerX,y:HOG_PAINTER.mapCamera().centerY})')
            page.locator('[data-action="center"]').click()
            centered=page.evaluate('({x:HOG_PAINTER.mapCamera().centerX,y:HOG_PAINTER.mapCamera().centerY,zoom:HOG_PAINTER.mapCamera().zoom})')
            check('Map drag pans the actual camera and center button restores the home view',
                  before_pan!=after_pan and centered['zoom']==1.3,{'before':before_pan,'panned':after_pan,'centered':centered})
            # Recenter on the same target, then make a second real canvas tap.
            page.evaluate("""q=>{const t=HOG_ENGINE.getTile(q);Object.assign(HOG_PAINTER.mapCamera(),{centerX:t.x,centerY:t.y,zoom:1.3});HOG_APP_DEBUG.render()}""",fixture['key'])
            select_target_by_real_canvas_click()

        page.locator('.hg39-map-target [data-action="dispatch-open"]').click()
        page.locator('.hg39-dispatch').wait_for(state='visible')
        panel=page.evaluate("""() => {
          const d=document.querySelector('.hg39-dispatch'),r=d.getBoundingClientRect();
          return {title:d.querySelector('header h2')?.innerText,heroes:d.querySelectorAll('.hg39-dispatch-hero').length,
            buttons:[...d.querySelectorAll('footer button')].map(b=>b.textContent.trim()),
            scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,
            panel:{x:r.x,y:r.y,w:r.width,h:r.height},confirmEnabled:!d.querySelector('[data-action="dispatch-confirm"]').disabled};
        }""")
        check(label+' real dispatch planner is usable and fits the viewport',panel['heroes']==2 and panel['confirmEnabled'] and
              panel['scrollWidth']<=width+1 and panel['panel']['w']>180,panel)
        # HG40/bugfix: march AP can be insufficient after selecting a
        # valid hero and a valid paid army. The button must be disabled BEFORE
        # a click, and re-enable without minting AP/army on the real UI.
        apCase=page.evaluate("""() => {
          const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,original=s.ap;
          const before={army:{...s.army},plans:JSON.stringify(s.hg20.plans),march:s.march,
            exp:s.expedition,ap:original};
          const get=()=>{
            const btn=document.querySelector('.hg39-dispatch [data-action="dispatch-confirm"]'),
              label=document.querySelector('[data-hg39-dispatch-ap]');
            return {disabled:btn?.disabled,ap:label?.textContent};
          };
          s.ap=0;HOG_APP_DEBUG.render();const insufficient=get();
          s.ap=original;HOG_APP_DEBUG.render();const affordable=get();
          return {insufficient,affordable,required:parseInt((affordable.ap||'').match(/cần ([\d,.]+)/)?.[1]||'0',10),
            valid:E.strictSave(s),unchanged:JSON.stringify(s.army)===JSON.stringify(before.army)&&
             JSON.stringify(s.hg20.plans)===before.plans&&s.march===before.march&&
             s.expedition===before.exp&&s.ap===before.ap};
        }""")
        check(label+' dispatch blocks low-AP attempt and enables it again when AP is sufficient',
              apCase['valid'] and apCase['unchanged'] and apCase['insufficient']['disabled'] and
              'thiếu AP' in (apCase['insufficient']['ap'] or '') and
              not apCase['affordable']['disabled'] and 'cần ' in (apCase['affordable']['ap'] or ''),apCase)
        page.screenshot(path=str(SHOTS/f'dispatch-{label}.png'),animations='disabled')
        if label=='960x540':
            page.locator('[data-action="dispatch-select-hero"][data-id="2"]').click()
            page.locator('[data-action="dispatch-save"]').click()
            page.locator('[data-action="dispatch-select-hero"][data-id="1"]').click()
            reserved_text=page.locator('.hg39-dispatch-row [data-dispatch-count="human_1"]').locator('xpath=../..').inner_text()
            page.locator('.hg39-dispatch-row [data-dispatch-count="human_1"]').fill('10')
            page.locator('#hg39-dispatch-unit').select_option('human_2')
            page.locator('[data-action="dispatch-add-unit"]').click()
            page.locator('[data-action="dispatch-adjust"][data-id="human_2"][data-delta="1"]').click()
            page.locator('[data-action="dispatch-save"]').click()
            edited=page.evaluate("""() => {
              const s=HOG_APP_DEBUG.getState(),plan=HOG_ENGINE.hg20HeroPlan(s,1),other=HOG_ENGINE.hg20HeroPlan(s,2);
              return {plan,other,total:plan.reduce((n,g)=>n+g.count,0),points:HOG_ENGINE.formationPoints(s,plan),
                limit:HOG_ENGINE.heroLimit(s.heroes[0].level),valid:HOG_ENGINE.strictSave(s),reserved:s.army.human_1-other.find(g=>g.unitId==='human_1').count};
            }""")
            check('Hero switching preserves separate troop reservations and edits a real saved formation',
                  reserved_text and edited['valid'] and edited['reserved']==23 and edited['total']==12 and
                  edited['points']<=edited['limit'] and {g['unitId'] for g in edited['other']}=={'human_1'},
                  {'visibleReservation':reserved_text,'edited':edited})
            page.locator('[data-action="dispatch-confirm"]').click()
            after=page.evaluate("""target => {
              const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
              return {version:s.version,heroId:s.march?.heroId||s.expedition?.heroId||null,target:s.march?.target||null,
                phase:s.march?.phase||null,stock:s.army,expedition:s.expedition?.army||null,
                secondPlan:E.hg20HeroPlan(s,2),valid:E.strictSave(s),total:s.expedition?Object.values(s.expedition.army).reduce((a,n)=>a+n,0):null,
                actualTarget:target};
            }""",fixture['key'])
            check('Confirm dispatch removes only the selected real army and begins a target march',
                  after['version']==7 and after['heroId']==1 and after['target']==fixture['key'] and
                  after['phase']=='outbound' and after['valid'] and after['total']==12 and
                  after['stock']['human_1']==18 and after['stock']['human_2']==6 and
                  sum(g['count'] for g in after['secondPlan'])==5,after)
            page.locator('#save').click()
            persisted=page.evaluate("""() => {
              const raw=localStorage.getItem(HOG_ENGINE.SAVE_KEY),s=raw&&HOG_ENGINE.parseSave(raw);
              return {present:!!raw,version:s?.version,hero:s?.march?.heroId||s?.expedition?.heroId,
                target:s?.march?.target,valid:s&&HOG_ENGINE.strictSave(s)};
            }""")
            check('Browser Save stores the real outbound expedition as version 7',persisted['present'] and persisted['version']==7 and
                  persisted['hero']==1 and persisted['target']==fixture['key'] and persisted['valid'],persisted)
            page.reload(wait_until='load');page.wait_for_timeout(150)
            reload=page.evaluate("""() => {
              const s=HOG_APP_DEBUG.getState();return {version:s.version,target:s.march?.target||null,
                hero:s.march?.heroId||null,valid:HOG_ENGINE.strictSave(s),army:s.expedition?.army||null};
            }""")
            check('Reload restores the same v07 expedition and reserves its troop snapshot',reload['version']==7 and
                  reload['target']==fixture['key'] and reload['hero']==1 and reload['valid'] and
                  sum((reload['army'] or {}).values())==12,reload)
            page.screenshot(path=str(SHOTS/'dispatch-confirmed-960x540.png'),animations='disabled')
            break
        page.locator('[data-action="dispatch-close"]').click()
    phone=browser.new_page(viewport={'width':412,'height':915},is_mobile=True,has_touch=True)
    phone.set_default_timeout(20000);phone.on('pageerror',lambda err:errors.append(str(err)))
    phone.goto(HTML.as_uri(),wait_until='load');phone.locator('[data-action="start"]').click()
    phone_fixture=phone.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,P=HOG_PAINTER,q=E.NPC_CAMPS_2009.find(n=>n.stars===1&&E.pathfind('3,4',n.key));
      s.army.human_1=28;s.army.human_2=8;E.setSpeed(s,1);E.hg20SetHeroPlan(s,1,[{unitId:'human_1',count:8}]);
      E.setFormation(s,[{unitId:'human_1',count:8}]);
      Object.assign(P.mapCamera(),{centerX:q.x,centerY:q.y,zoom:1.3});HOG_APP_DEBUG.render();return {key:q.key,x:q.x,y:q.y,valid:E.strictSave(s)};
    }""")
    touch=phone.evaluate("""q=>{const c=document.getElementById('world-canvas'),m=HOG_PAINTER.mapCamera(),s=m.zoom*48,
      x=c.width/2-m.centerX*s+(q.x+.5)*s,y=c.height/2-m.centerY*s+(q.y+.5)*s,r=c.getBoundingClientRect();
      return {x:r.left+x/c.width*r.width,y:r.top+y/c.height*r.height}}""",phone_fixture)
    phone.touchscreen.tap(touch['x'],touch['y']);phone.wait_for_timeout(100)
    phone_title=phone.locator('.hg39-map-target .target-information h2').inner_text()
    phone_dispatch_enabled=phone.locator('.hg39-map-target [data-action="dispatch-open"]').is_enabled()
    check('412x915 touch selects the world-map tile instead of the overlapping minimap',
          (fixture['name'] and fixture['name'] in phone_title) or fixture['key'] in phone_title or
          f"({phone_fixture['x']},{phone_fixture['y']})" in phone_title.replace(' ',''),
          {'title':phone_title,'dispatchEnabled':phone_dispatch_enabled})
    phone_layout=phone.evaluate("""() => ({width:document.documentElement.scrollWidth,viewport:innerWidth,
      canvas:document.querySelector('#world-canvas').getBoundingClientRect().width,
      dock:document.querySelector('.hg39-map-dock').getBoundingClientRect().height})""")
    check('412x915 phone touch map remains visible and fits without horizontal overflow',
          phone_fixture['valid'] and phone_layout['width']<=412 and phone_layout['canvas']>180 and phone_layout['dock']>80,phone_layout)
    phone.screenshot(path=str(SHOTS/'map-target-phone-412x915.png'),animations='disabled')
    phone.locator('.hg39-map-target [data-action="dispatch-open"]').click()
    phone_panel=phone.evaluate("""() => {const e=document.querySelector('.hg39-dispatch'),r=e.getBoundingClientRect();return {
      heroes:e.querySelectorAll('.hg39-dispatch-hero').length,width:document.documentElement.scrollWidth,
      viewport:innerWidth,panel:{x:r.x,y:r.y,w:r.width,h:r.height},confirm:!e.querySelector('[data-action="dispatch-confirm"]').disabled}}""")
    check('412x915 touch dispatch panel fits and keeps the real confirm action reachable',
          phone_panel['heroes']==1 and phone_panel['width']<=412 and phone_panel['panel']['w']>350 and phone_panel['confirm'],phone_panel)
    phone.screenshot(path=str(SHOTS/'dispatch-phone-412x915.png'),animations='disabled')
    phone.close()
    for width,height,label in ((844,390,'phone-landscape-844x390'),(667,375,'compact-landscape-667x375')):
        context=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
        touch_page=context.new_page();touch_page.set_default_timeout(12000)
        touch_page.on('pageerror',lambda err:errors.append(str(err)))
        touch_page.goto(HTML.as_uri(),wait_until='load')
        touch_page.locator('[data-action="start"]').tap()
        quickstart=touch_page.locator('.hg39-map-dock .hg39-map-details').filter(has_text='Tác vụ nhanh')
        quickstart.locator('summary').tap()
        touch_page.wait_for_timeout(1200)
        check(label+' quickstart drawer stays open across the real game-tick render',
              quickstart.evaluate('el=>el.open') and touch_page.locator('.quickstart-strip').is_visible())
        touch_page.locator('.hg39-map-dock .quickstart-actions [data-action="autoformation"]').tap()
        touch_layout=touch_page.evaluate("""() => {
          const map=document.querySelector('#world-canvas').getBoundingClientRect();
          return {width:document.documentElement.scrollWidth,viewport:innerWidth,height:innerHeight,
            mapBottom:map.bottom,formation:HOG_APP_DEBUG.getState().formation.length,
            quickstartOpen:document.querySelector('.hg39-map-dock .hg39-map-details[data-hg39-drawer="Tác vụ nhanh"]')?.open};
        }""")
        check(label+' touch auto-formation performs the real game action and map stays in the viewport',
              touch_layout['formation']>0 and touch_layout['width']<=width+1 and
              touch_layout['mapBottom']<=height+1 and touch_layout['quickstartOpen'],touch_layout)
        touch_page.screenshot(path=str(SHOTS/f'phone-quickstart-{label}.png'),animations='disabled')
        context.close()
    check('No uncaught browser errors during map, dispatch or Save/Reload',not errors,errors)
    browser.close()

receipt={'status':'PASS' if all(item['pass'] for item in checks) else 'FAIL','checks':checks,'pageErrors':errors,
         'html_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest(),'mode':'real Chromium file://; seeded only fixture troops/heroes, all dispatch edits and payment use live game UI/API'}
(OUT/'map-dispatch-chrome.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"HG39 MAP/DISPATCH CHROMIUM {sum(item['pass'] for item in checks)}/{len(checks)} {receipt['status']}",flush=True)
raise SystemExit(0 if receipt['status']=='PASS' else 1)
