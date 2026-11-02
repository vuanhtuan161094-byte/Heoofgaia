from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, tempfile

root = Path(__file__).resolve().parent
html = root / 'Play-Heoofgaia-HG08.html'
evidence = root / 'docs' / 'evidence' / 'hg08'
evidence.mkdir(parents=True, exist_ok=True)
checks = []
errors = []

def chromium_path():
    configured = os.environ.get('HOG_CHROMIUM_PATH')
    candidates = [Path(configured)] if configured else [
        Path(os.environ.get('PROGRAMFILES', 'C:/Program Files')) / 'Google' / 'Chrome' / 'Application' / 'chrome.exe',
        Path(os.environ.get('PROGRAMFILES(X86)', 'C:/Program Files (x86)')) / 'Microsoft' / 'Edge' / 'Application' / 'msedge.exe',
        Path(os.environ.get('PROGRAMFILES', 'C:/Program Files')) / 'Microsoft' / 'Edge' / 'Application' / 'msedge.exe',
    ]
    return next((str(path) for path in candidates if path.is_file()), None)

executable = chromium_path()
if not executable:
    raise SystemExit('Chrome/Edge not found; set HOG_CHROMIUM_PATH to an installed browser executable')

def check(name, ok):
    checks.append({'name': name, 'passed': bool(ok)})
    print(('PASS' if ok else 'FAIL'), name)

with sync_playwright() as p:
    user_data = tempfile.TemporaryDirectory(prefix='heoofgaia-hg07-profile-')
    context = p.chromium.launch_persistent_context(
        user_data.name,
        headless=True,
        executable_path=executable,
        args=['--no-sandbox', '--disable-dev-shm-usage'],
        viewport={'width': 1280, 'height': 720},
    )
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(html.as_uri(), wait_until='load')
    check('file:// HTML opens in Chromium', page.title().startswith('Hẻoofgaia HG-08'))
    page.locator('[data-action="race"][data-race="elf"]').click()
    page.locator('[data-action="start"]').click()
    check('Game starts from local file', page.evaluate('HOG_APP_DEBUG.getState().race') == 'elf')
    page.screenshot(path=str(evidence / 'screenshot-file-launch-1280x720.png'), full_page=True)
    page.locator('#save').click()
    saved = page.evaluate('localStorage.getItem("heoofgaia_hg_only_v07")')
    check('file:// save is written under v07 key', bool(saved))
    page.reload(wait_until='load')
    check('file:// reload restores the selected race', page.evaluate('HOG_APP_DEBUG.getState()?.race') == 'elf')
    check('file:// reload preserves the v07 save', bool(page.evaluate('localStorage.getItem("heoofgaia_hg_only_v07")')))
    page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();s.speed=1;s.wounded.elf_1=2;HOG_APP_DEBUG.render()})()')
    page.locator('#nav [data-tab="heroes"]').click()
    page.locator('[data-action="heal"]').click()
    check('file:// Arena starts a paid recovery queue', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.arenaQueue?.count===2&&s.arenaQueue?.paidGold===36&&s.wounded.elf_1===0})()'))
    page.screenshot(path=str(evidence / 'screenshot-file-arena-queue-1280x720.png'), full_page=True)
    page.reload(wait_until='load')
    check('file:// reload resumes Arena queue and countdown', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.arenaQueue?.count===2&&s.arenaQueue?.remaining>0&&s.arenaQueue?.remaining<=400})()'))
    check('No page errors during file launch and reload', not errors)
    context.close()

    context = p.chromium.launch_persistent_context(
        user_data.name,
        headless=True,
        executable_path=executable,
        args=['--no-sandbox', '--disable-dev-shm-usage'],
        viewport={'width': 1280, 'height': 720},
    )
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(html.as_uri(), wait_until='load')
    check('New browser process reload restores saved race', page.evaluate('HOG_APP_DEBUG.getState()?.race') == 'elf')
    check('New browser process retains v07 save', bool(page.evaluate('localStorage.getItem("heoofgaia_hg_only_v07")')))
    check('New browser process resumes persisted Arena recovery', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.arenaQueue?.count===2&&s.arenaQueue?.remaining>0})()'))
    check('No page errors after persistent-profile restart', not errors)
    context.close()
    user_data.cleanup()

result = {'checks': checks, 'errors': errors, 'passed': sum(x['passed'] for x in checks), 'total': len(checks)}
(evidence / 'file-launch-persistence.json').write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
raise SystemExit(0 if result['passed'] == result['total'] else 1)
