"""Installed-Chrome playtest for the dated Chinese 2009 Human recruitment task."""
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
SHOT = ART / 'china-2009-recruit-archers-chrome.png'
RECEIPT = QA / 'china-2009-recruit-archers-chrome.json'
checks, errors = [], []
console_warnings = []

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

browser = browser_path()
if not browser:
    raise SystemExit('Chrome/Edge not found; set HOG_CHROMIUM_PATH')
if not HTML.is_file():
    raise SystemExit(f'Build offline HTML first: {HTML}')

with sync_playwright() as playwright:
    profile = tempfile.TemporaryDirectory(prefix='hog-hg10-china-daily-task-')
    context = playwright.chromium.launch_persistent_context(
        profile.name, headless=True, executable_path=browser,
        args=['--no-sandbox', '--disable-dev-shm-usage'],
        viewport={'width': 1280, 'height': 900}, device_scale_factor=1,
    )
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: console_warnings.append(message.text) if message.type in ('error', 'warning') else None)
    page.goto(HTML.as_uri(), wait_until='load')
    check('Chrome opens the offline Anh Hùng Thời Loạn build', page.title() == 'Anh Hùng Thời Loạn')
    page.locator('[data-action="start"]').click()
    page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();s.buildings.hall=3;s.buildings.barracks=3;s.spells.bootcamp=1;s.speed=60;for(const k of HOG_CATALOG.keys)s.res[k]=HOG_ENGINE.limits(s)[k];s.res.wood-=500;HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()''')
    strict_trace = [('fixture', page.evaluate('HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())'))]
    page.locator('#nav [data-tab="tasks"]').click()
    body = page.locator('#main').inner_text()
    check('The dated Chinese task appears in a separate, labeled section', 'SINA 2009' in body and 'Tuyển mộ cung thủ' in body and 'SRC54' in body)
    check('The international task list remains a distinct board', page.locator('[data-action="acceptdaily"][data-id="getting_started"]').count() == 1)
    before = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {wood:s.res.wood,archers:s.army.human_3||0,accepted:s.china2009DailyTaskState.accepted.includes('recruit_archers'),progress:HOG_ENGINE.china2009DailyTasks(s)[0].progress}})()''')
    page.locator('[data-action="acceptdaily2009"][data-id="recruit_archers"]').click()
    strict_trace.append(('accepted', page.evaluate('HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())')))
    accepted = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {accepted:s.china2009DailyTaskState.accepted.includes('recruit_archers'),progress:HOG_ENGINE.china2009DailyTasks(s)[0].progress}})()''')
    check('Actual Accept action persists the task without granting progress', accepted == {'accepted': True, 'progress': 0})
    page.locator('#nav [data-tab="army"]').click()
    page.locator('#q_human_3').fill('20')
    page.locator('[data-action="recruit"][data-id="human_3"]').click()
    strict_trace.append(('queued', page.evaluate('HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())')))
    queued = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {count:s.training.find(q=>q.unitId==='human_3')?.count,army:s.army.human_3||0,progress:HOG_ENGINE.china2009DailyTasks(s)[0].progress}})()''')
    check('Actual recruit action queues 20 Human Archers and does not count unfinished troops', queued == {'count': 20, 'army': 0, 'progress': 0})
    page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),q=s.training.find(x=>x.unitId==='human_3');HOG_ENGINE.tick(s,s.lastTick+q.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()})()''')
    strict_trace.append(('trained', page.evaluate('HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())')))
    trained = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {queued:s.training.some(q=>q.unitId==='human_3'),army:s.army.human_3,progress:HOG_ENGINE.china2009DailyTasks(s)[0].progress,ready:HOG_ENGINE.china2009DailyTasks(s)[0].ready}})()''')
    check('Training completion adds actual troops and completes the objective', trained == {'queued': False, 'army': 20, 'progress': 20, 'ready': True})
    page.locator('#nav [data-tab="tasks"]').click()
    wood_at_claim = page.evaluate('HOG_APP_DEBUG.getState().res.wood')
    page.locator('[data-action="claimdaily2009"][data-id="recruit_archers"]').click()
    strict_trace.append(('claimed', page.evaluate('HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())')))
    awarded = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {wood:s.res.wood,archers:s.army.human_3,claimed:s.china2009DailyTaskState.claimed.includes('recruit_archers')}})()''')
    check('Actual Claim action grants exactly 100 Wood and 10 Archers once', awarded == {'wood': wood_at_claim + 100, 'archers': 30, 'claimed': True})
    check('v07 strict save validation holds at each gameplay stage', all(valid for _, valid in strict_trace), strict_trace)
    page.locator('#save').click()
    page.evaluate('(v)=>window.__strictTrace=v', strict_trace)
    saved = page.evaluate('''(()=>{const raw=localStorage.getItem(HOG_ENGINE.SAVE_KEY);let parseError=null;try{HOG_ENGINE.parseSave(raw)}catch(e){parseError=e.message}return {exists:!!raw,length:raw?.length||0,parseError,strict:HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState()),strictTrace:window.__strictTrace||null}})()''')
    check('Save button writes a parseable v07 payload before reload', saved['exists'] and saved['length'] > 0 and saved['parseError'] is None and saved['strict'], saved)
    page.reload(wait_until='load')
    persisted = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();if(!s)return {loaded:false};const q=HOG_ENGINE.china2009DailyTasks(s)[0];return {loaded:true,version:s.version,valid:HOG_ENGINE.strictSave(s),progress:q.progress,claimed:q.claimed,archers:s.army.human_3}})()''')
    check('Browser reload preserves the task, reward and valid v07 save', persisted == {'loaded': True, 'version': 7, 'valid': True, 'progress': 20, 'claimed': True, 'archers': 30}, {'state': persisted, 'console': console_warnings[-5:]})
    if persisted.get('loaded'):
        page.locator('#nav [data-tab="tasks"]').click()
        check('The completed reward control cannot be claimed twice', page.locator('[data-action="claimdaily2009"][data-id="recruit_archers"]').is_disabled())
    else:
        check('The completed reward control cannot be claimed twice', False, 'Save failed to reload; see diagnostics above.')
    page.wait_for_timeout(500)
    page.screenshot(path=str(SHOT), full_page=True)
    check('No JavaScript exceptions during the real UI flow', not errors, errors[:3])
    context.close()
    profile.cleanup()

receipt = {
    'suite': 'HG-10 dated China 2009 Human recruitment task',
    'source': 'SRC54, Sina Games, 2009-08-24',
    'browserExecutable': browser,
    'inputHtml': HTML.name,
    'fixtureDisclosure': 'QA seeds Town Hall 3, Barracks 3, Bootcamp 1, resource headroom and 1x clock speed; it does not seed task progress, trained Archers, completion or rewards. The task is accepted in UI, 20 Archers are queued from the real recruitment UI, the engine training queue completes, reward is claimed in UI, then file-save reload is checked.',
    'checks': checks,
    'errors': errors,
    'consoleWarnings': console_warnings,
    'passed': sum(row['passed'] for row in checks),
    'total': len(checks),
    'screenshot': str(SHOT.relative_to(ROOT)).replace('\\', '/'),
}
RECEIPT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'TOTAL {receipt["passed"]}/{receipt["total"]} PASS')
print('SCREENSHOT', SHOT)
print('SCREENSHOT SHA256', hashlib.sha256(SHOT.read_bytes()).hexdigest().upper())
raise SystemExit(0 if receipt['passed'] == receipt['total'] else 1)
