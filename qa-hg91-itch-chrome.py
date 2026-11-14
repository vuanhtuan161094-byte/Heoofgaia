"""HG91 — real Chromium smoke on a LOCAL HTTP origin for itch.io HTML5 staging.
Not a claim of live itch.io iframe/device acceptance.
"""
import hashlib,json,tempfile,threading,shutil
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).parent
BUILD=ROOT/"Play-Heoofgaia-HG11.html"
EVIDENCE=ROOT/"docs"/"qa"/"hg91"
EVIDENCE.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];shots=[]
def check(name,condition,detail=None):
    good=bool(condition)
    checks.append({"name":name,"passed":good,"detail":detail})
    print(("PASS " if good else "FAIL ")+name,flush=True)
    if not good:raise AssertionError(name+": "+repr(detail)[:400])
def shot(page,name):
    path=EVIDENCE/name
    page.screenshot(path=str(path),animations="disabled")
    shots.append(str(path.relative_to(ROOT)))
class QuietHTTP(SimpleHTTPRequestHandler):
    def __init__(self,*a,root=None,**kw):super().__init__(*a,directory=str(root),**kw)
    def log_message(self,*a):pass

def run():
    assert BUILD.is_file() and BUILD.stat().st_size>1000000
    with tempfile.TemporaryDirectory(prefix="hg91-itch-") as t:
        dest=Path(t);shutil.copy2(BUILD,dest/"index.html")
        server=ThreadingHTTPServer(("127.0.0.1",0),lambda *args,**kw:QuietHTTP(*args,root=dest,**kw))
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        url=f"http://127.0.0.1:{server.server_address[1]}/index.html"
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
                desktop=browser.new_context(viewport={"width":1280,"height":720})
                page=desktop.new_page()
                page.on("pageerror",lambda e:errors.append(str(e)))
                page.goto(url,wait_until="load",timeout=120000)
                page.wait_for_function("Boolean(window.HOG_HG91_I18N)",timeout=20000)
                check("Game starts from hosted index.html",page.locator('[data-action="start"]').count()==1)
                info=page.evaluate("""() => ({
                 langs:HOG_HG91_I18N.supported,keys:HOG_HG91_I18N.keys,
                 version:HOG_HG91_I18N.saveVersion,complete:HOG_HG91_I18N.complete,
                 initial:HOG_HG91_I18N.getLocale()
                })""")
                check("Six real locales, explicit partial coverage, unchanged Save v07",
                    info["langs"]==["vi","en","zh","ja","ko","th"] and
                    info["keys"]>=75 and info["version"]==7 and
                    info["complete"] is False and info["initial"]=="vi",info)
                page.locator("#hg91-settings-trigger").click()
                check("Accessible language and onboarding panel opens",
                      page.locator("#hg91-menu").is_visible() and
                      page.locator("#hg91-menu ol li").count()==5)
                page.locator("#hg91-language").select_option("en")
                check("English translation applies to actual intro",
                      "Found Your Kingdom" in page.locator('[data-action="start"]').inner_text() and
                      "Quick Start Guide" in page.locator('#hg91-menu summary').inner_text())
                shot(page,"intro-english-desktop.png")
                page.locator("#hg91-settings-close").click()
                page.locator('[data-action="start"]').click()
                page.locator('#nav [data-tab="heroes"]').wait_for()
                check("English nav translated after live dynamic render",
                      "Heroes" in page.locator('#nav [data-tab="heroes"]').inner_text())
                # Locale changes run synchronously without changing game data. The
                # one-second economy tick cannot execute inside the JS evaluation.
                ledger=page.evaluate("""() => {
                  const s=HOG_APP_DEBUG.getState(),a=HOG_ENGINE.serializeSave(s),i=HOG_HG91_I18N,
                  codes=['zh','ja','ko','th','en','vi'],names={};
                  for(const code of codes){
                    i.setLocale(code);names[code]=i.translate('Thế giới');
                  }
                  return {same:a===HOG_ENGINE.serializeSave(s),v:s.version,
                    valid:HOG_ENGINE.strictSave(s),names,locale:i.getLocale()};
                }""")
                check("All locale changes leave canonical Save v07 completely unchanged",
                      ledger["same"] and ledger["v"]==7 and ledger["valid"],ledger)
                check("Chinese/Japanese/Korean/Thai translations are substantive",
                      len(set(ledger["names"].values()))==6,ledger["names"])
                page.locator("#hg91-settings-trigger").click()
                page.locator("#hg91-language").select_option("zh")
                page.locator("#hg91-sound").check()
                page.locator("#hg91-settings-close").click()
                page.locator("#save").click()
                page.reload(wait_until="load",timeout=120000)
                page.wait_for_function("Boolean(window.HOG_HG91_I18N)")
                saved=page.evaluate("""() => ({
                  locale:HOG_HG91_I18N.getLocale(),
                  version:HOG_APP_DEBUG.getState()?.version,
                  sound:localStorage.getItem('heoofgaia_hg91_click_sound'),
                  valid:HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState()),
                  present:!!localStorage.getItem(HOG_ENGINE.SAVE_KEY)
                })""")
                check("Hosted reload preserves Chinese selection, opt-in audio and canonical Save",
                      saved["locale"]=="zh" and saved["version"]==7 and saved["sound"]=="on" and
                      saved["present"] and saved["valid"],saved)
                check("Chinese language visible in live game",
                      "世界" in page.locator('#nav [data-tab="map"]').inner_text())
                shot(page,"game-chinese-desktop.png")
                mobile=browser.new_context(viewport={"width":412,"height":915},is_mobile=True,has_touch=True)
                m=mobile.new_page();m.on("pageerror",lambda e:errors.append(str(e)))
                m.goto(url,wait_until="load",timeout=120000)
                m.locator("#hg91-settings-trigger").click()
                geometry=m.evaluate("""() => {
                  const b=document.querySelector('#hg91-menu').getBoundingClientRect();
                  return {x:b.x,right:b.right,y:b.y,bottom:b.bottom,
                    viewport:innerWidth,h:innerHeight};
                }""")
                check("Mobile language panel fits 412px portrait",
                      geometry["x"]>=0 and geometry["right"]<=geometry["viewport"]+1 and
                      geometry["y"]>=0 and geometry["bottom"]<=geometry["h"]+1,geometry)
                shot(m,"intro-language-mobile-412x915.png")
                mobile.close()
                check("No uncaught JavaScript exceptions",not errors,errors)
                desktop.close();browser.close()
        finally:server.shutdown();server.server_close()
try:
    run()
except Exception as ex:
    failed=str(ex)
else:
    failed=None
receipt={
 "status":"FAIL" if failed else "PASS","checks":checks,"errors":errors,
 "exception":failed,"screenshots":shots,
 "htmlSha256":hashlib.sha256(BUILD.read_bytes()).hexdigest() if BUILD.exists() else None,
 "scope":"real Chromium over local HTTP, emulated mobile; NOT live itch.io or physical Android"
}
(EVIDENCE/"itch-chromium.json").write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("HG91",receipt["status"],len([x for x in checks if x["passed"]]),"/",len(checks),flush=True)
if failed:raise SystemExit(1)
