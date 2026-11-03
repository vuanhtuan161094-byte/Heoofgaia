"""Installed-Chrome test for source-cited China 2009 task resets on Fame promotion."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib, json, os, sys, tempfile

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent
HTML = ROOT / 'Play-Heoofgaia-HG11.html'
SHOT = ROOT / 'docs' / 'evidence' / 'hg08' / 'china-daily-task-fame-reset-chrome.png'
RECEIPT = ROOT / 'docs' / 'qa' / 'hg08' / 'china-daily-task-fame-reset-chrome.json'
SHOT.parent.mkdir(parents=True, exist_ok=True)
RECEIPT.parent.mkdir(parents=True, exist_ok=True)
checks, errors, console_errors = [], [], []

def check(name, passed, detail=None):
    row = {'name': name, 'passed': bool(passed)}
    if detail is not None:
        row['detail'] = detail
    checks.append(row)
    print(('PASS' if passed else 'FAIL'), name, detail or '')

def browser_path():
    configured = os.environ.get('HOG_CHROMIUM_PATH')
    options = [Path(configured)] if configured else [
        Path(os.environ.get('PROGRAMFILES', 'C:/Program Files')) / 'Google/Chrome/Application/chrome.exe',
        Path(os.environ.get('PROGRAMFILES(X86)', 'C:/Program Files (x86)')) / 'Microsoft/Edge/Application/msedge.exe',
    ]
    return next((str(p) for p in options if p and p.is_file()), None)

def click_minimap_tile(page, tx, ty):
    canvas = page.locator('#world-canvas')
    box = canvas.bounding_box()
    point = page.evaluate(f'''(()=>{{const c=document.querySelector('#world-canvas'),m=HOG_PAINTER.miniBounds(c),pad=9;
      return {{x:(m.x+pad+({tx}+.5)*(m.w-2*pad)/HOG_ENGINE.WIDTH)/c.width,
              y:(m.y+pad+({ty}+.5)*(m.h-2*pad)/HOG_ENGINE.HEIGHT)/c.height}}}})()''')
    page.mouse.click(box['x'] + point['x'] * box['width'], box['y'] + point['y'] * box['height'])

browser = browser_path()
if not browser:
    raise SystemExit('Chrome/Edge not found; set HOG_CHROMIUM_PATH')
if not HTML.is_file():
    raise SystemExit(f'Build offline HTML first: {HTML}')

with sync_playwright() as playwright:
    profile = tempfile.TemporaryDirectory(prefix='hog-hg08-fame-reset-')
    context = playwright.chromium.launch_persistent_context(
        profile.name, headless=True, executable_path=browser,
        args=['--no-sandbox', '--disable-dev-shm-usage'],
        viewport={'width': 1280, 'height': 900}, device_scale_factor=1,
    )
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
    page.goto(HTML.as_uri(), wait_until='load')
    check('Offline build opens with canonical game title', page.title() == 'Anh Hùng Thời Loạn')
    page.locator('[data-action="start"]').click()
    page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();s.fame=199;HOG_ENGINE.ensure10(s);HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()''')
    page.locator('#nav [data-tab="tasks"]').click()
    text = page.locator('#main').inner_text()
    check('China 2009 daily-task profile is separate and documents Fame-stage refresh', 'CHINA DAILY TASKS' in text and 'SRC61' in text and 'làm mới nhiệm vụ ngày' in text)
    page.locator('[data-action="acceptdaily2009"][data-id="recruit_archers"]').click()
    accepted = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),t=HOG_ENGINE.china2009DailyTasks(s)[0];return {accepted:t.accepted,stage:t.fameStage,progress:t.progress,valid:HOG_ENGINE.strictSave(s)}})()''')
    check('Real task Accept records work at Fame stage 5', accepted == {'accepted': True, 'stage': 5, 'progress': 0, 'valid': True}, accepted)
    page.locator('#nav [data-tab="map"]').click()
    target = page.evaluate('''(()=>{const t=HOG_ENGINE.NPC_CAMPS_2009.find(x=>x.stars===1);return t?{key:t.key,x:t.x,y:t.y,stars:t.stars}:null})()''')
    check('Rank-boundary battle target comes from the dated 1-star NPC map', bool(target and target['key']))
    click_minimap_tile(page, target['x'], target['y'])
    page.locator('[data-action="march"]').click()
    dispatched = page.evaluate('''(key)=>{const s=HOG_APP_DEBUG.getState();return s.march?.target===key&&s.expedition?.army.human_1===16}''', target['key'])
    check('Real map click and March dispatch the starter formation', dispatched)
    page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()})()''')
    check('Natural travel opens the real NPC battle', page.evaluate('(key)=>HOG_APP_DEBUG.getState().battle?.target===key', target['key']))
    for _ in range(80):
        if not page.evaluate('!!HOG_APP_DEBUG.getState().battle'):
            break
        page.locator('[data-action="battle"][data-cmd="attack"]').click()
    reset_200 = page.evaluate('''(key)=>{const s=HOG_APP_DEBUG.getState(),t=HOG_ENGINE.china2009DailyTasks(s)[0];return {fame:s.fame,battle:!!s.battle,cleared:s.cleared.includes(key),accepted:t.accepted,claimed:t.claimed,progress:t.progress,stage:t.fameStage,valid:HOG_ENGINE.strictSave(s),notice:s.log.find(x=>x.includes('SRC61'))}}''', target['key'])
    check('Real 1-star victory crosses Fame 200 and resets the China daily board', reset_200.get('fame', 0) >= 200 and not reset_200.get('battle') and reset_200.get('cleared') and reset_200.get('accepted') is False and reset_200.get('claimed') is False and reset_200.get('progress') == 0 and reset_200.get('stage') == 200 and reset_200.get('valid') and reset_200.get('notice'), reset_200)
    page.locator('#nav [data-tab="tasks"]').click()
    reset_button = page.locator('[data-action="acceptdaily2009"][data-id="recruit_archers"]')
    check('Fame promotion returns the task UI to its real enabled Accept control', reset_button.count() == 1 and reset_button.is_enabled())
    page.locator('[data-action="acceptdaily2009"][data-id="recruit_archers"]').click()
    page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();s.fame=799;HOG_ENGINE.china2009DailyTasks(s,s.lastTick);HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()''')
    same_stage = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),t=HOG_ENGINE.china2009DailyTasks(s)[0];return {accepted:t.accepted,stage:t.fameStage}})()''')
    check('Fame changes inside the same rank do not reset task state', same_stage == {'accepted': True, 'stage': 200}, same_stage)
    page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();s.fame=800;HOG_ENGINE.china2009DailyTasks(s,s.lastTick);HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()''')
    reset_800 = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),t=HOG_ENGINE.china2009DailyTasks(s)[0];return {accepted:t.accepted,progress:t.progress,stage:t.fameStage,notice:s.log[0]}})()''')
    check('Fame 800 promotion refreshes the task board a second time', reset_800.get('accepted') is False and reset_800.get('progress') == 0 and reset_800.get('stage') == 800 and 'SRC61' in reset_800.get('notice', ''), reset_800)
    page.locator('#save').click()
    page.wait_for_timeout(100)
    page.screenshot(path=str(SHOT), full_page=True)
    before_reload = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),t=HOG_ENGINE.china2009DailyTasks(s)[0];return {stored:!!localStorage.getItem(HOG_ENGINE.SAVE_KEY),stage:t.fameStage,accepted:t.accepted,valid:HOG_ENGINE.strictSave(s)}})()''')
    check('Browser Save stores a strict v07 state after Fame reset', before_reload == {'stored': True, 'stage': 800, 'accepted': False, 'valid': True}, before_reload)
    page.reload(wait_until='load')
    persisted = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),t=HOG_ENGINE.china2009DailyTasks(s)[0];return {version:s.version,stage:t.fameStage,accepted:t.accepted,progress:t.progress,valid:HOG_ENGINE.strictSave(s)}})()''')
    check('Browser reload retains the current Fame stage and refreshed board', persisted == {'version': 7, 'stage': 800, 'accepted': False, 'progress': 0, 'valid': True}, persisted)
    stage_matrix = page.evaluate('''(()=>{
      const thresholds=[5,200,800,2200,5800,11500,21000,33000,54000,80000,150000,300000,500000,700000,1000000],id='recruit_archers';
      if(JSON.stringify(HOG_ENGINE.FAME_AP.map(row=>row[0]))!==JSON.stringify(thresholds))return {ok:false,reason:'historic Fame thresholds differ',thresholds:HOG_ENGINE.FAME_AP.map(row=>row[0])};
      let s=HOG_ENGINE.make('human',Date.UTC(2026,10,3)),reset=0,roundTrips=0,prepared=false;
      for(let i=1;i<thresholds.length;i++){
        const stage=thresholds[i],prior=thresholds[i-1];if(!prepared)HOG_ENGINE.acceptChina2009DailyTask(s,id,s.lastTick);
        s.china2009DailyTaskState.progress[id]=i%2?12:20;if(i%2===0)s.china2009DailyTaskState.claimed=[id];
        s.fame=stage-1;let row=HOG_ENGINE.china2009DailyTasks(s,s.lastTick)[0];if(!row.accepted||row.fameStage!==prior||row.progress!==(i%2?12:20)||row.claimed!==(i%2===0))return {ok:false,reason:'premature reset',stage};
        s.fame=stage;row=HOG_ENGINE.china2009DailyTasks(s,s.lastTick)[0];if(row.accepted||row.claimed||row.progress!==0||row.fameStage!==stage)return {ok:false,reason:'missing reset',stage};reset++;
        s=HOG_ENGINE.parseSave(HOG_ENGINE.serializeSave(s));if(s.version!==7||!HOG_ENGINE.strictSave(s)||HOG_ENGINE.china2009DailyTasks(s,s.lastTick)[0].fameStage!==stage)return {ok:false,reason:'v07 round-trip',stage};roundTrips++;
        prepared=false;
        if(i<thresholds.length-1){HOG_ENGINE.acceptChina2009DailyTask(s,id,s.lastTick);s.fame=stage+1;row=HOG_ENGINE.china2009DailyTasks(s,s.lastTick)[0];if(!row.accepted||row.fameStage!==stage)return {ok:false,reason:'same-stage work lost',stage};prepared=true;}
      }
      return {ok:true,thresholds:thresholds.length,resets:reset,v07RoundTrips:roundTrips,version:s.version};
    })()''')
    check('Live Chrome engine resets at all 14 Fame promotions and round-trips v07 at each rank', stage_matrix.get('ok') and stage_matrix.get('thresholds') == 15 and stage_matrix.get('resets') == 14 and stage_matrix.get('v07RoundTrips') == 14 and stage_matrix.get('version') == 7, stage_matrix)
    check('No JavaScript exceptions or console errors', not errors and not console_errors, {'page': errors[:3], 'console': console_errors[:3]})
    context.close()
    profile.cleanup()

receipt = {
    'suite': 'HG-08 SRC61 China 2009 daily tasks reset on Fame promotion',
    'source': 'SRC61, 17173, 2009-10-25; Fame stage thresholds derived from SRC20, 17173, 2009-12-27.',
    'browserExecutable': browser,
    'inputHtml': HTML.name,
    'fixtureDisclosure': 'Chrome opens the actual standalone file:// game. The QA fixture seeds only Fame=199, then the actual map-click/March/tick/Attack flow wins a real 1-star NPC and the existing combat settlement crosses the 200 Fame rank; this resets the accepted task. A controlled Fame value of 799 checks within-rank preservation before 800 checks the next reset. A separate fresh in-browser engine state exercises all 14 transitions in the 15 dated SRC20 Fame ranks and 14 strict v07 save round-trips. No battle, objective completion, reward or victory is injected.',
    'checks': checks,
    'errors': errors,
    'consoleErrors': console_errors,
    'passed': sum(row['passed'] for row in checks),
    'total': len(checks),
    'screenshot': str(SHOT.relative_to(ROOT)).replace('\\', '/'),
}
RECEIPT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'TOTAL {receipt["passed"]}/{receipt["total"]} PASS')
print('SCREENSHOT', SHOT)
print('SCREENSHOT SHA256', hashlib.sha256(SHOT.read_bytes()).hexdigest().upper() if SHOT.exists() else 'MISSING')
raise SystemExit(0 if receipt['passed'] == receipt['total'] else 1)
