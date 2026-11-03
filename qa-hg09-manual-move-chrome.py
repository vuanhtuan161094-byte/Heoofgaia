"""Real file:// browser test for the HG-09 click-to-move tactical command."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib, json, os, sys, tempfile

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent
HTML = ROOT / 'Play-Heoofgaia-HG11.html'
SCREENSHOT = ROOT / 'docs' / 'evidence' / 'hg09' / 'manual-battle-move-chrome.png'
RECEIPT = ROOT / 'docs' / 'qa' / 'hg09' / 'manual-battle-move-chrome.json'
SCREENSHOT.parent.mkdir(parents=True, exist_ok=True)
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

browser = browser_path()
if not browser:
    raise SystemExit('Chrome/Edge not found; set HOG_CHROMIUM_PATH')
if not HTML.is_file():
    raise SystemExit(f'Build offline HTML first: {HTML}')

with sync_playwright() as playwright:
    profile = tempfile.TemporaryDirectory(prefix='hog-hg09-manual-move-')
    context = playwright.chromium.launch_persistent_context(
        profile.name, headless=True, executable_path=browser,
        args=['--no-sandbox', '--disable-dev-shm-usage'],
        viewport={'width': 1440, 'height': 900}, device_scale_factor=1,
    )
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
    page.goto(HTML.as_uri(), wait_until='load')
    check('Standalone file:// build opens with the game title', page.title() == 'Anh Hùng Thời Loạn')
    page.locator('[data-action="start"]').click()
    page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),unit='human_3';s.army[unit]=40;HOG_ENGINE.setFormation(s,[{unitId:unit,count:40}]);const t=HOG_ENGINE.NPC_CAMPS_2009.find(c=>c.stars===1&&HOG_ENGINE.pathfind('3,4',c.key));HOG_ENGINE.startMarch(s,t.key);HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()})()''')
    check('The real map March and travel tick open a 1-star NPC battle', page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return !!s.battle&&s.battle.kind==='npc'&&s.battle.allies.length===1&&s.battle.allies[0].id==='p0'})()'''))
    page.locator('[data-action="stack"][data-id="p0"]').click()
    page.locator('[data-action="move-mode"]').click()
    check('The live battle UI enters direct movement mode', page.locator('#battle-move-prompt').is_visible())
    before = page.evaluate('''(()=>{const b=HOG_APP_DEBUG.getState().battle;return {turn:b.turn,position:{x:b.allies[0].x,y:b.allies[0].y},enemyHp:b.enemies.reduce((n,u)=>n+u.pool,0)}})()''')
    canvas = page.locator('#battle-canvas')
    box = canvas.bounding_box()
    point = page.evaluate('''(()=>{const c=document.querySelector('#battle-canvas'),g=HOG_ENGINE.BATTLE_GRID,cellH=(c.height-g.top-g.bottom)/g.rows;return {x:3.5/g.cols,y:(g.top+.5*cellH)/c.height}})()''')
    page.mouse.click(box['x']+point['x']*box['width'], box['y']+point['y']*box['height'])
    moved = page.evaluate('''(()=>{const b=HOG_APP_DEBUG.getState().battle,m=b?.lastMoves?.find(q=>q.unitId==='p0');return {turn:b?.turn,movement:m||null,selectedDamage:b?.lastTargets?.p0||null,enemyHp:b?.enemies.reduce((n,u)=>n+u.pool,0),valid:HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())}})()''')
    passed_move = bool(moved['movement'] and moved['movement']['from']=={'x':1,'y':0} and moved['movement']['to']=={'x':2,'y':0} and moved['movement']['steps']==1 and moved['selectedDamage'] is None and moved['enemyHp']==before['enemyHp'] and moved['valid'])
    check('A real battlefield click moves the selected stack one cell and spends its action', passed_move, {'before': before, 'after': moved})
    page.screenshot(path=str(SCREENSHOT), full_page=True)
    page.locator('#save').click()
    saved = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {stored:!!localStorage.getItem(HOG_ENGINE.SAVE_KEY),version:s.version,strict:HOG_ENGINE.strictSave(s)}})()''')
    check('Browser Save stores the moved formation in a strict v07 save', saved == {'stored': True, 'version': 7, 'strict': True}, saved)
    page.reload(wait_until='load')
    restored = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle,m=b?.lastMoves?.find(q=>q.unitId==='p0');return {version:s.version,position:{x:b?.allies[0].x,y:b?.allies[0].y},move:m||null,strict:HOG_ENGINE.strictSave(s)}})()''')
    check('Reload restores the exact battlefield cell and v07 movement receipt', restored['version']==7 and restored['position']=={'x':2,'y':0} and restored['move']['to']=={'x':2,'y':0} and restored['strict'], restored)
    for _ in range(72):
        if not page.evaluate('!!HOG_APP_DEBUG.getState().battle'):
            break
        page.locator('[data-action="battle"][data-cmd="attack"]').click()
    outcome = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {battle:!!s.battle,cleared:s.cleared.length,army:s.expedition?.army?.human_3||0,valid:HOG_ENGINE.strictSave(s)}})()''')
    check('The moved force can continue through real turns to battle settlement', not outcome['battle'] and outcome['cleared']>0 and outcome['valid'], outcome)
    check('No browser JS exceptions or console errors', not errors and not console_errors, {'page':errors[:3],'console':console_errors[:3]})
    context.close()
    profile.cleanup()

receipt = {
    'suite': 'HG-09 direct battlefield cell movement',
    'browserExecutable': browser,
    'inputHtml': HTML.name,
    'fixtureDisclosure': 'The actual file:// game starts a new Human save, seeds only 40 Archers and their real formation to skip recruitment, dispatches to a dated 1-star NPC using March, and advances the real travel tick. Combat is created by the engine. The player selects the live stack card, arms the move command and clicks a battlefield cell with the mouse. No position, battle result or reward is injected.',
    'checks': checks,
    'errors': errors,
    'consoleErrors': console_errors,
    'passed': sum(row['passed'] for row in checks),
    'total': len(checks),
    'screenshot': str(SCREENSHOT.relative_to(ROOT)).replace('\\','/'),
}
RECEIPT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'TOTAL {receipt["passed"]}/{receipt["total"]} PASS')
print('SCREENSHOT', SCREENSHOT)
print('SCREENSHOT SHA256', hashlib.sha256(SCREENSHOT.read_bytes()).hexdigest().upper() if SCREENSHOT.exists() else 'MISSING')
raise SystemExit(0 if receipt['passed'] == receipt['total'] else 1)
