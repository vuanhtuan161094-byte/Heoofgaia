"""Real installed-Chrome acceptance for the HG-10 daily NPC task flow."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib, json, os, sys, tempfile

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent
HTML = ROOT / 'Play-Heoofgaia-HG11.html'
ART = ROOT / 'docs' / 'evidence' / 'hg10'
QA = ROOT / 'docs' / 'qa' / 'hg10'
ART.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
SHOT = ART / 'daily-task-getting-started-chrome.png'
RECEIPT = QA / 'daily-task-getting-started-chrome.json'
checks, errors = [], []

def check(name, passed, detail=None):
    row = {'name': name, 'passed': bool(passed)}
    if detail is not None:
        row['detail'] = detail
    checks.append(row)
    print(('PASS' if passed else 'FAIL'), name, (detail or ''))

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
    profile = tempfile.TemporaryDirectory(prefix='hog-hg10-daily-task-')
    context = playwright.chromium.launch_persistent_context(
        profile.name, headless=True, executable_path=browser,
        args=['--no-sandbox', '--disable-dev-shm-usage'],
        viewport={'width': 1280, 'height': 860}, device_scale_factor=1,
    )
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(HTML.as_uri(), wait_until='load')
    check('real installed browser opens the offline Anh Hùng Thời Loạn build', page.title().startswith('Anh Hùng Thời Loạn'))
    page.locator('[data-action="start"]').click()
    page.locator('#nav [data-tab="tasks"]').click()
    check('Tasks tab displays the sourced Getting Started daily task', 'Khởi đầu' in page.locator('#main').inner_text() and '500' in page.locator('#main').inner_text() and '7 AP' in page.locator('#main').inner_text())
    task = page.evaluate('HOG_ENGINE.dailyTasks(HOG_APP_DEBUG.getState())[0]')
    gold_before = page.evaluate('HOG_APP_DEBUG.getState().res.gold')
    ap_before = page.evaluate('HOG_APP_DEBUG.getState().ap')
    page.locator('[data-action="acceptdaily"][data-id="getting_started"]').click()
    check('actual Accept button adds a daily task to the v07 ledger', page.evaluate('HOG_APP_DEBUG.getState().dailyTaskState.accepted.includes("getting_started")'))
    check('accepting the task does not grant premature resources or AP', page.evaluate(f'(()=>{{const s=HOG_APP_DEBUG.getState();return s.res.gold==={gold_before}&&s.ap==={ap_before}}})()'))
    page.locator('#nav [data-tab="map"]').click()
    target = page.evaluate('HOG_ENGINE.NPC_CAMPS_2009.find(x=>x.stars===1)')
    check('target is an actual source-indexed 1-star NPC camp', bool(target and target.get('key')))
    click_minimap_tile(page, target['x'], target['y'])
    march = page.locator('[data-action="march"]')
    march.wait_for(state='visible')
    check('real map selection exposes a working March action', march.is_enabled())
    march.click()
    check('real dispatch spends AP and sends actual starter troops', page.evaluate(f'''(()=>{{const s=HOG_APP_DEBUG.getState();return s.march?.phase==='outbound'&&s.march?.target==='{target['key']}'&&s.expedition?.army.human_1===16&&s.army.human_1===0&&s.ap===92}})()'''))
    page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()})()')
    check('actual simulation arrival opens the selected NPC combat', page.evaluate(f'''(()=>{{const s=HOG_APP_DEBUG.getState();return s.battle?.target==='{target['key']}'&&s.battle.allies.some(g=>g.unitId==='human_1'&&g.count===16)}})()'''))
    for _ in range(80):
        if not page.evaluate('!!HOG_APP_DEBUG.getState().battle'):
            break
        page.locator('[data-action="battle"][data-cmd="attack"]').click()
    check('live combat actions defeat the NPC without a mocked clear flag', page.evaluate(f'''(()=>{{const s=HOG_APP_DEBUG.getState();return !s.battle&&s.cleared.includes('{target['key']}')}})()'''))
    page.locator('#nav [data-tab="tasks"]').click()
    check('task objective advances from the real cleared 1-star NPC', page.locator('#main').inner_text().count('1/1') > 0)
    gold_at_claim = page.evaluate('HOG_APP_DEBUG.getState().res.gold')
    ap_at_claim = page.evaluate('HOG_APP_DEBUG.getState().ap')
    page.locator('[data-action="claimdaily"][data-id="getting_started"]').click()
    awarded = page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return {gold:s.res.gold,ap:s.ap,claimed:s.dailyTaskState.claimed.includes("getting_started")}})()')
    check('actual Claim button pays 500 Gold and up to 7 AP exactly once', awarded['gold'] == gold_at_claim + 500 and awarded['ap'] == min(page.evaluate('HOG_APP_DEBUG.getState().apMax'), ap_at_claim + 7) and awarded['claimed'])
    page.locator('#save').click()
    page.reload(wait_until='load')
    persisted = page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return {version:s.version,claimed:s.dailyTaskState.claimed.includes("getting_started"),gold:s.res.gold,valid:HOG_ENGINE.strictSave(s)}})()')
    check('real browser reload preserves task completion and strict v07 Save', persisted['version'] == 7 and persisted['claimed'] and persisted['gold'] == awarded['gold'] and persisted['valid'])
    page.locator('#nav [data-tab="tasks"]').click()
    check('task cannot be claimed twice after browser reload', page.locator('[data-action="claimdaily"][data-id="getting_started"]').is_disabled())
    page.wait_for_timeout(3100)
    page.screenshot(path=str(SHOT), full_page=True)
    check('no JavaScript page errors in the end-to-end browser flow', not errors, errors[:3])
    context.close()
    profile.cleanup()

receipt = {
    'suite': 'HG-10 real daily task flow', 'browserExecutable': browser,
    'inputHtml': HTML.name, 'target': {'key': target['key'], 'x': target['x'], 'y': target['y'], 'stars': target['stars']},
    'checks': checks, 'errors': errors,
    'passed': sum(row['passed'] for row in checks), 'total': len(checks),
    'screenshot': str(SHOT.relative_to(ROOT)).replace('\\', '/'),
}
RECEIPT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'TOTAL {receipt["passed"]}/{receipt["total"]} PASS')
print('SCREENSHOT', SHOT)
print('SCREENSHOT SHA256', hashlib.sha256(SHOT.read_bytes()).hexdigest().upper())
raise SystemExit(0 if receipt['passed'] == receipt['total'] else 1)
