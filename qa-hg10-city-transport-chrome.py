"""Real Chromium UI acceptance for HG-10 city resource transport.
Run after build_offline.py with .venv/Scripts/python.exe.
The second castle is a deterministic fixture; troop/resource dispatch,
capacity checks, AP spend, save/load, arrival, delivery and return are live.
"""
from pathlib import Path
import hashlib, json, os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).parent
HTML=(ROOT/'Play-Heoofgaia-HG11.html').read_text(encoding='utf-8')
EVIDENCE=ROOT/'docs'/'evidence'/'hg10'
QA=ROOT/'docs'/'qa'/'hg10'
EVIDENCE.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(name,fn):
    try:
        assert fn(),name
        checks.append({'name':name,'passed':True});print('PASS',name)
    except Exception as exc:
        checks.append({'name':name,'passed':False,'error':str(exc)});print('FAIL',name,str(exc))
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def click_map_key(page,key):
    x,y=map(int,key.split(','));canvas=page.locator('#world-canvas');box=canvas.bounding_box()
    point=page.evaluate(f'''(()=>{{const c=document.querySelector('#world-canvas'),m=HOG_PAINTER.miniBounds(c),pad=9;
      return {{x:(m.x+pad+({x}+.5)*(m.w-2*pad)/HOG_ENGINE.WIDTH)/c.width,
              y:(m.y+pad+({y}+.5)*(m.h-2*pad)/HOG_ENGINE.HEIGHT)/c.height}}}})()''')
    page.mouse.click(box['x']+point['x']*box['width'],box['y']+point['y']*box['height'])
with sync_playwright() as p:
    executable=os.environ.get('HOG_CHROMIUM_PATH')
    if not executable:
        candidates=[Path(os.environ.get('PROGRAMFILES','C:/Program Files'))/'Google'/'Chrome'/'Application'/'chrome.exe',
                    Path(os.environ.get('PROGRAMFILES','C:/Program Files'))/'Microsoft'/'Edge'/'Application'/'msedge.exe']
        executable=next((str(candidate) for candidate in candidates if candidate.is_file()),None)
    browser=p.chromium.launch(headless=True,executable_path=executable,args=['--no-sandbox','--disable-dev-shm-usage'])
    def launch(store=None):
        page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
        page.on('pageerror',lambda exc:errors.append(str(exc)))
        page.goto('about:blank')
        page.evaluate('(seed)=>{window.__qaStore=seed;Object.defineProperty(window,"localStorage",{configurable:true,value:{getItem(k){return Object.prototype.hasOwnProperty.call(window.__qaStore,k)?window.__qaStore[k]:null},setItem(k,v){window.__qaStore[k]=String(v)},removeItem(k){delete window.__qaStore[k]}}})}',store or {})
        page.set_content(HTML,wait_until='load',timeout=30000)
        return page
    page=launch();page.locator('[data-action="start"]').click()
    page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),seed=HOG_ENGINE.make('elf',s.lastTick),city=JSON.parse(JSON.stringify(seed.cities[0]));
      city.id='city-9-10';city.key='9,10';city.name='Thành nhận Elf';city.main=false;city.sourceStatus='MODELED_STARTING_CITY';city.local.race='elf';city.local.res={gold:0,wood:0,ore:0,sulfur:0,crystal:0};
      s.cities.push(city);s.fame=5800;s.ap=100;s.speed=1;s.res.gold=2000;s.res.wood=500;s.army.human_1=3;HOG_ENGINE.ensure10(s);HOG_ENGINE.syncCityState(s);HOG_APP_DEBUG.render()})()''')
    click_map_key(page,'9,10')
    check('Owned-city map target opens the live transport form',lambda:page.locator('.city-transport').is_visible() and 'Thành nhận Elf' in page.locator('.city-transport').inner_text())
    check('Form shows the selected carrier unit and cargo controls',lambda:page.locator('#city-transport-unit option[value="human_1"]').count()==1 and page.locator('#city-transport-gold').count()==1 and page.locator('#city-transport-crystal').count()==1)
    page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();window.__transportBefore={ap:s.ap,gold:s.res.gold,wood:s.res.wood,army:s.army.human_1,transports:s.cityTransports.length}})()')
    page.locator('#city-transport-unit').select_option('human_1');page.locator('#city-transport-count').fill('1');page.locator('#city-transport-gold').fill('301');page.locator('[data-action="city-transport"]').click()
    check('Overloaded dispatch is rejected without AP, troops or cargo loss',lambda:page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState(),b=window.__transportBefore;return s.ap>=b.ap-.1&&s.ap<=b.ap+1&&s.res.gold>=b.gold-1&&s.res.gold<=b.gold+1&&s.res.wood>=b.wood-1&&s.res.wood<=b.wood+1&&s.army.human_1===b.army&&s.cityTransports.length===b.transports})()'))
    page.locator('#city-transport-count').fill('2');page.locator('#city-transport-gold').fill('400');page.locator('#city-transport-wood').fill('40');page.locator('[data-action="city-transport"]').click()
    check('Valid convoy spends 20 AP and reserves the chosen force and cargo',lambda:page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState(),q=s.cityTransports[0],b=window.__transportBefore;return s.ap<=b.ap-19.9&&s.ap>=b.ap-20&&s.army.human_1===1&&q?.weight===600&&q.capacity===600&&q.phase==="outbound"})()'))
    page.locator('#save').click();saved=page.evaluate('(key)=>window.__qaStore[key]',page.evaluate('HOG_ENGINE.SAVE_KEY'))
    check('Existing v07 Save/Load JSON includes the outbound convoy',lambda:bool(saved) and json.loads(saved)['cityTransports'][0]['phase']=='outbound')
    second=launch({page.evaluate('HOG_ENGINE.SAVE_KEY'):saved})
    click_map_key(second,'9,10')
    check('Reloaded browser restores the real outbound ledger and map UI',lambda:second.evaluate('HOG_APP_DEBUG.getState().cityTransports.length===1') and 'đang tới thành nhận' in second.locator('.city-transport-ledger').inner_text().lower())
    if second.evaluate('HOG_APP_DEBUG.getState().speed!==60'):second.locator('#speed').click()
    shot=EVIDENCE/'city-transport-outbound-chrome.png';second.screenshot(path=str(shot),full_page=True)
    second.wait_for_function('HOG_APP_DEBUG.getState().cityTransports[0]?.phase==="return"',timeout=15000)
    check('Convoy arrives once and credits destination resources',lambda:second.evaluate('(()=>{const s=HOG_APP_DEBUG.getState(),c=HOG_ENGINE.cityForKey(s,"9,10");return c.local.res.gold>=400&&c.local.res.wood>=40&&s.cityTransports[0]?.phase==="return"})()'))
    second.locator('#save').click()
    second.wait_for_function('HOG_APP_DEBUG.getState().cityTransports.length===0',timeout=15000)
    check('Returning carriers are restored once to their original city',lambda:second.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return HOG_ENGINE.cityForKey(s,"3,4").local.army.human_1===3&&s.cityTransports.length===0})()'))
    second.locator('#save').click();finalshot=EVIDENCE/'city-transport-delivered-chrome.png';second.screenshot(path=str(finalshot),full_page=True)
    check('No JavaScript page errors in either real Chromium session',lambda:not errors)
    browser.close()
report={'suite':'HG-10 live city transport UI','fixture':'Owned Elf secondary city at 9,10; transport interactions and all engine state transitions are live.','checks':checks,'passed':sum(c['passed'] for c in checks),'failed':sum(not c['passed'] for c in checks),'pageErrors':errors,'screenshots':{p.name:sha(p) for p in [shot,finalshot] if p.exists()}}
(QA/'city-resource-transport-chrome.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('TOTAL',report['passed'],'/',len(checks),'PASS')
raise SystemExit(1 if report['failed'] or errors else 0)
