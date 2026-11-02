"""HG-10 city-transport flow against the built HTML opened from real file://."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib,json,os,tempfile

ROOT=Path(__file__).parent;HTML=ROOT/'Play-Heoofgaia-HG11.html'
EVIDENCE=ROOT/'docs'/'evidence'/'hg10';QA=ROOT/'docs'/'qa'/'hg10'
EVIDENCE.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(name,passed):
    checks.append({'name':name,'passed':bool(passed)});print(('PASS' if passed else 'FAIL'),name)
def click_map_key(page,key):
    x,y=map(int,key.split(','));canvas=page.locator('#world-canvas');box=canvas.bounding_box()
    pt=page.evaluate(f'''(()=>{{const c=document.querySelector('#world-canvas'),m=HOG_PAINTER.miniBounds(c),pad=9;return {{x:(m.x+pad+({x}+.5)*(m.w-2*pad)/HOG_ENGINE.WIDTH)/c.width,y:(m.y+pad+({y}+.5)*(m.h-2*pad)/HOG_ENGINE.HEIGHT)/c.height}}}})()''')
    page.mouse.click(box['x']+pt['x']*box['width'],box['y']+pt['y']*box['height'])
with sync_playwright() as p:
    configured=os.environ.get('HOG_CHROMIUM_PATH')
    paths=[Path(configured)] if configured else [Path(os.environ.get('PROGRAMFILES','C:/Program Files'))/'Google'/'Chrome'/'Application'/'chrome.exe',Path(os.environ.get('PROGRAMFILES','C:/Program Files'))/'Microsoft'/'Edge'/'Application'/'msedge.exe']
    executable=next((str(x) for x in paths if x.is_file()),None)
    if not executable:raise SystemExit('Chrome/Edge not found; set HOG_CHROMIUM_PATH')
    profile=tempfile.TemporaryDirectory(prefix='hog1-transport-file-')
    context=p.chromium.launch_persistent_context(profile.name,headless=True,executable_path=executable,args=['--no-sandbox','--disable-dev-shm-usage'],viewport={'width':1440,'height':900})
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(HTML.as_uri(),wait_until='load')
    check('Built offline HTML opens from real file://',page.url.startswith('file:') and page.title().startswith('Anh Hùng Thời Loạn'))
    page.locator('[data-action="start"]').click()
    page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),seed=HOG_ENGINE.make('elf',s.lastTick),city=JSON.parse(JSON.stringify(seed.cities[0]));city.id='city-9-10';city.key='9,10';city.name='Thành nhận Elf';city.main=false;city.sourceStatus='MODELED_STARTING_CITY';city.local.race='elf';city.local.res={gold:0,wood:0,ore:0,sulfur:0,crystal:0};s.cities.push(city);s.fame=5800;s.ap=100;s.speed=1;s.res.gold=2000;s.res.wood=500;s.army.human_1=3;HOG_ENGINE.ensure10(s);HOG_ENGINE.syncCityState(s);HOG_APP_DEBUG.render()})()''')
    click_map_key(page,'9,10');check('Real file UI presents carrier selection and cargo',page.locator('.city-transport').is_visible() and page.locator('#city-transport-unit option[value="human_1"]').count()==1)
    page.locator('#city-transport-unit').select_option('human_1');page.locator('#city-transport-count').fill('1');page.locator('#city-transport-gold').fill('301');page.locator('[data-action="city-transport"]').click()
    check('file:// rejects over-capacity without charging AP',page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.ap>=99.9&&s.army.human_1===3&&s.cityTransports.length===0})()'))
    page.locator('#city-transport-count').fill('2');page.locator('#city-transport-gold').fill('400');page.locator('#city-transport-wood').fill('40');page.locator('[data-action="city-transport"]').click()
    check('file:// sends the valid convoy in live engine state',page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState(),q=s.cityTransports[0];return q?.phase==="outbound"&&q.weight===600&&q.capacity===600&&s.army.human_1===1&&s.ap<100})()'))
    page.locator('#save').click();page.reload(wait_until='load');click_map_key(page,'9,10')
    check('file:// Save/Reload keeps the outbound convoy and map ledger',page.evaluate('HOG_APP_DEBUG.getState().cityTransports[0]?.phase')=='outbound' and 'đang tới thành nhận' in page.locator('.city-transport-ledger').inner_text().lower())
    if page.evaluate('HOG_APP_DEBUG.getState().speed!==60'):page.locator('#speed').click()
    page.locator('.city-transport-ledger').scroll_into_view_if_needed();outshot=EVIDENCE/'city-transport-file-outbound-chrome.png';page.screenshot(path=str(outshot),full_page=True)
    page.wait_for_function('HOG_APP_DEBUG.getState().cityTransports[0]?.phase==="return"',timeout=15000)
    check('file:// convoy delivers resources exactly once',page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState(),c=HOG_ENGINE.cityForKey(s,"9,10");return c.local.res.gold>=400&&c.local.res.wood>=40&&s.cityTransports[0]?.phase==="return"})()'))
    page.locator('#save').click();page.reload(wait_until='load')
    check('file:// reload preserves return-trip phase',page.evaluate('HOG_APP_DEBUG.getState().cityTransports[0]?.phase')=='return')
    page.wait_for_function('HOG_APP_DEBUG.getState().cityTransports.length===0',timeout=15000)
    check('file:// return restores carriers to the originating city once',page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.cityTransports.length===0&&HOG_ENGINE.cityForKey(s,"3,4").local.army.human_1===3})()'))
    page.locator('#save').click();page.locator('.city-transport-ledger').count()==0
    check('No page exceptions through real file transport and reload',not errors)
    delivery=EVIDENCE/'city-transport-file-delivered-chrome.png';page.screenshot(path=str(delivery),full_page=True)
    context.close();profile.cleanup()
report={'suite':'HG-10 city transport actual file://','fixture':'Owned secondary city at 9,10; dispatch, persistence, delivery and return are live.','checks':checks,'passed':sum(c['passed'] for c in checks),'failed':sum(not c['passed'] for c in checks),'pageErrors':errors,'screenshots':{p.name:hashlib.sha256(p.read_bytes()).hexdigest().upper() for p in [outshot,delivery] if p.exists()}}
(QA/'city-resource-transport-file-chrome.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('TOTAL',report['passed'],'/',len(checks),'PASS');raise SystemExit(1 if report['failed'] or errors else 0)
