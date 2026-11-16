"""Muu Dinh Tam Quoc P2 minimal real-browser gate for CI."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, sys, os

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'index.html').read_text(encoding='utf-8')
STUB = """<script>window.__P2_ENABLE_QA__=true;const __store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__store[k]??null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k]}});</script>"""

def main():
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_BIN') or None, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content(HTML.replace('<script>', STUB + '<script>', 1), wait_until='domcontentloaded')
        def check(label, condition):
            checks.append({'name': label, 'pass': bool(condition)})
            print(('PASS' if condition else 'FAIL') + ' ' + label)
        check('QA API initialized', page.evaluate('typeof window.__P2_QA__ === "object"'))
        check('starter heroes initialized', page.evaluate('Object.keys(window.__P2_QA__.getGame().hero).length >= 3'))
        check('formation renders', page.locator('body').inner_text().find('Bày Trận') >= 0)
        page.evaluate("window.__P2_QA__.beginBattle(1,'campaign')")
        check('combat started', page.evaluate('!!window.__P2_QA__.getBattle()'))
        page.evaluate('window.__P2_QA__.stepBattle()')
        check('combat event recorded', page.evaluate('window.__P2_QA__.getBattle().events.length >= 1'))
        page.evaluate('window.__P2_QA__.skipBattle()')
        check('combat report saved', page.evaluate('window.__P2_QA__.getGame().battleReports.length >= 1'))
        check('no runtime exceptions', not errors)
        page.screenshot(path=str(ROOT / 'qa' / 'smoke-1280x720.png'))
        browser.close()
    result = {'total': len(checks), 'passed': sum(x['pass'] for x in checks), 'checks': checks}
    (ROOT / 'qa' / 'smoke-result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result))
    return 0 if result['passed'] == result['total'] else 1

if __name__ == '__main__':
    sys.exit(main())
