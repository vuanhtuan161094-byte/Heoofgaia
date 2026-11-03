"""Exercise actual HG-09 commands and inspect their saved per-stack receipts in file:// Chrome."""
from pathlib import Path
import hashlib, json, sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent
HTML = ROOT / "Play-Heoofgaia-HG11.html"
EVIDENCE = ROOT / "docs/evidence/hg09"
QA = ROOT / "docs/qa/hg09"
EVIDENCE.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
checks, errors = [], []

def check(name, passed, detail=""):
    checks.append({"name": name, "passed": bool(passed), "detail": detail})
    print(("PASS " if passed else "FAIL ") + name + (f" — {detail}" if detail else ""), flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="C:/Program Files/Google/Chrome/Application/chrome.exe",
                                headless=True, args=["--no-sandbox", "--allow-file-access-from-files", "--disable-dev-shm-usage"])
    page = browser.new_page(viewport={"width": 1440, "height": 1050})
    page.set_default_timeout(8000)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(HTML.as_uri(), wait_until="load")
    page.locator('[data-action="start"]').click()
    check("Normal Human start creates v07 save before combat", page.evaluate("HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())"))
    page.locator('#nav [data-tab="map"]').click()
    point = page.evaluate('''()=>{const c=document.querySelector('#world-canvas'),r=c.getBoundingClientRect(),m=HOG_PAINTER.miniBounds(c),pad=9;return {x:r.left+(m.x+pad+6.5*(m.w-2*pad)/100)/c.width*r.width,y:r.top+(m.y+pad+3.5*(m.h-2*pad)/100)/c.height*r.height}}''')
    page.mouse.click(point["x"], point["y"])
    page.locator('[data-action="march"]').click()
    page.evaluate('''()=>{const s=HOG_APP_DEBUG.getState();HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()}''')
    check("Real map March and engine travel open the natural mine battle", page.evaluate('HOG_APP_DEBUG.getState().battle?.target==="6,3"'))
    page.locator('[data-action="stack"][data-id="p0"]').click()
    page.locator('[data-action="battle"][data-cmd="defend"]').click()
    defended = page.evaluate('''()=>{const s=HOG_APP_DEBUG.getState(),e=s.battle?.lastEvents?.find(x=>x.actorId==='p0'),row=document.querySelector('[data-battle-event="p0"]');return {saveVersion:s.version,order:e?.order,casualties:e?.casualties,text:row?.innerText||'',rows:document.querySelectorAll('[data-battle-event]').length,strict:HOG_ENGINE.strictSave(s)}}''')
    check("Stand By produces a real per-stack wait receipt in the live battle UI", defended["order"] == "defend" and "Stand By" in defended["text"] and "bỏ lượt" in defended["text"] and defended["strict"], json.dumps(defended, ensure_ascii=False))
    check("Every acted living stack in the turn has exactly one rendered receipt", page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),events=s.battle.lastEvents;return events.length===document.querySelectorAll('[data-battle-event]').length&&new Set(events.map(e=>e.actorId)).size===events.length})()'''))
    desktop = EVIDENCE / "action-receipts-chrome.png"
    page.screenshot(path=str(desktop), full_page=True)
    page.locator('#save').click()
    saved_events = page.evaluate('JSON.stringify(HOG_APP_DEBUG.getState().battle.lastEvents)')
    page.reload(wait_until="load")
    loaded = page.evaluate('''()=>{const s=HOG_APP_DEBUG.getState();return {version:s?.version,events:JSON.stringify(s?.battle?.lastEvents),strict:HOG_ENGINE.strictSave(s)}}''')
    check("Browser Save/Reload preserves exact action receipts under v07", loaded["version"] == 7 and loaded["events"] == saved_events and loaded["strict"])
    casualties = None
    for _ in range(48):
        battle = page.evaluate('''()=>{const s=HOG_APP_DEBUG.getState();return s.battle?{events:s.battle.lastEvents||[],alive:true}: {alive:false}}''')
        if not battle["alive"]:
            break
        page.locator('[data-action="battle"][data-cmd="attack"]').click()
        casualties = page.evaluate('''()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;if(!b)return null;const e=(b.lastEvents||[]).find(x=>x.casualties>0),row=e&&document.querySelector(`[data-battle-event="${e.actorId}"]`),actor=e&&[...b.allies,...b.enemies].find(x=>x.id===e.actorId);return e?{event:e,actorName:actor?.name||'',row:row?.innerText||'',strict:HOG_ENGINE.strictSave(s)}:null}''')
        if casualties:
            break
    check("Actual attack turn records a positive stack casualty in the engine", bool(casualties and casualties["event"]["casualties"] > 0 and casualties["strict"]), json.dumps(casualties, ensure_ascii=False))
    expected = f"{casualties['event']['casualties']:,}".replace(",", ".") if casualties else ""
    check("Battle UI identifies the exact affected stack and casualty count", bool(casualties and casualties["actorName"] in casualties["row"] and "quân tổn thất" in casualties["row"] and expected in casualties["row"]), json.dumps(casualties, ensure_ascii=False))
    if casualties:
        shot = EVIDENCE / "action-receipts-casualty-chrome.png"
        page.screenshot(path=str(shot), full_page=True)
    page.set_viewport_size({"width": 390, "height": 844})
    check("Mobile combat receipts remain visible without horizontal page overflow", page.locator("[data-battle-receipts]").is_visible() and page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
    mobile = EVIDENCE / "action-receipts-mobile-chrome.png"
    page.screenshot(path=str(mobile), full_page=True)
    check("No JavaScript page errors during commands, save/load or receipt review", not errors, json.dumps(errors, ensure_ascii=False))
    browser.close()

shots = [desktop, mobile]
if 'shot' in locals() and shot.exists():
    shots.append(shot)
receipt = {"command": ".venv\\Scripts\\python.exe qa-hg09-action-receipts-chrome.py",
           "htmlSha256": hashlib.sha256(HTML.read_bytes()).hexdigest().upper(),
           "total": len(checks), "passed": sum(c["passed"] for c in checks),
           "errors": errors, "checks": checks, "actualCasualty": casualties,
           "fixtureDisclosure": "Normal offline Human start. Actual minimap mouse click, AP-paid March, engine travel tick, real Stand By and Attack buttons. Only travel time is advanced; no battle positions, troop HP/count, action results, or casualties are seeded. Browser Save/Reload verifies exact v07 lastEvents. Screenshots are actual installed Chrome file:// captures of this reconstruction.",
           "screenshots": [{"path": str(s.relative_to(ROOT)).replace("\\", "/"), "sha256": hashlib.sha256(s.read_bytes()).hexdigest().upper()} for s in shots]}
out = QA / "action-receipts-chrome.json"
out.write_text(json.dumps(receipt, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"TOTAL {receipt['passed']}/{receipt['total']} PASS")
raise SystemExit(0 if receipt["passed"] == receipt["total"] else 1)
