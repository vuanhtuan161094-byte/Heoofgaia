"""HG55 actual Chromium desktop/mobile-emulation performance + Save v07 gate.

The runner is a Linux desktop Chromium, NOT physical Android; do not label
these readings Android-device FPS/RAM. 5 viewports exercise the ONE offline HTML.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import atexit, hashlib, json, statistics, sys, time

ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
QA=ROOT/"docs/qa/hg55";QA.mkdir(parents=True,exist_ok=True)
SHOTS=ROOT/"docs/evidence/hg55";SHOTS.mkdir(parents=True,exist_ok=True)
checks=[];results=[];screenshots=[];errors=[]
if hasattr(sys.stdout,"reconfigure"):sys.stdout.reconfigure(encoding="utf-8",errors="replace")
def check(label,ok,detail=None):
    checks.append({"label":label,"pass":bool(ok),"detail":detail})
    print(("HG55 PASS " if ok else "HG55 FAIL ")+label,flush=True)
    if not ok:raise AssertionError(label+" "+str(detail)[:400])
def persist():
    report={"gate":"HG55 Chromium real desktop runtime and emulated Android viewports",
      "physical_android_tested":False,"save_version":7,
      "html_bytes":HTML.stat().st_size if HTML.exists() else None,
      "html_sha256":hashlib.sha256(HTML.read_bytes()).hexdigest() if HTML.exists() else None,
      "passed":sum(x["pass"] for x in checks),"total":len(checks),
      "checks":checks,"measurements":results,"errors":errors,"screenshots":screenshots}
    (QA/"performance-chromium.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
atexit.register(persist)
PACK=json.loads((QA/"build-image-pack.json").read_text(encoding="utf-8"))
check("22 lossless optimized images and source provenance intact",
      PACK["verified_image_count"]==22 and PACK["all_visible_pixels_identical"]
      and PACK["source_asset_files_modified"] is False and PACK["saved_html_bytes"]>=1_000_000,
      {"count":PACK["verified_image_count"],"bytes_saved":PACK["saved_html_bytes"]})
check("exactly one canonical offline HTML is present",HTML.is_file())

profiles=[
  ("desktop-1280x720",1280,720,False,"human"),
  ("desktop-960x540",960,540,False,"elf"),
  ("phone-844x390",844,390,True,"orc"),
  ("phone-768x260",768,260,True,"undead"),
  ("phone-412x915",412,915,True,"human")
]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"])
    for name,w,h,mobile,race in profiles:
        ctx=browser.new_context(viewport={"width":w,"height":h},
             is_mobile=mobile,has_touch=mobile,device_scale_factor=1)
        page=ctx.new_page();page.set_default_timeout(22000)
        page.on("pageerror",lambda error,n=name:errors.append({"viewport":n,"error":str(error)}))
        cdp=ctx.new_cdp_session(page);cdp.send("Performance.enable")
        wall_start=time.perf_counter()
        page.goto(HTML.as_uri(),wait_until="load",timeout=90000)
        navigation_ms=round((time.perf_counter()-wall_start)*1000)
        page.locator('[data-action="race"][data-race="'+race+'"]').click()
        page.locator('[data-action="start"]').click()
        page.wait_for_timeout(350)
        js=page.evaluate("""() => {
            const s=HOG_APP_DEBUG.getState();
            const optimized=["hg28-world-meadow","city-art-human","city-art-elf",
                "city-art-orc","city-art-undead","battlefield-human-meadow"];
            const images=optimized.map(id=>{
                const im=document.getElementById(id);
                return {id,loaded:!!im?.naturalWidth,mime:im?.currentSrc?.slice(0,16)||""};
            });
            return {version:s.version,strict:HOG_ENGINE.strictSave(s),
                race:s.race,images,
                documentWidth:document.documentElement.scrollWidth,
                viewportWidth:innerWidth,
                heap:performance.memory?.usedJSHeapSize??null,
                navigation:performance.getEntriesByType("navigation").map(n=>({
                    domContentLoadedMs:n.domContentLoadedEventEnd,
                    loadEventMs:n.loadEventEnd
                }))};
        }""")
        check(name+" Save v07 valid after New Game",js["version"]==7 and js["strict"] and js["race"]==race,js)
        check(name+" optimized images decode in the real HTML",
              all(x["loaded"] and x["mime"].startswith("data:image/webp") for x in js["images"]),js["images"])
        check(name+" responsive viewport without document overflow",js["documentWidth"]<=w+2,js["documentWidth"])
        # Frame interval is recorded diagnostically, not asserted as real phone FPS.
        frames=page.evaluate("""async () => {
            const steps=[];let last=performance.now();
            await new Promise(resolve=>{
                let start=null;
                function sample(t){if(start===null)start=t;
                    steps.push(t-last);last=t;
                    if(t-start<900)requestAnimationFrame(sample);else resolve();
                }requestAnimationFrame(sample);
            });
            steps.sort((a,b)=>a-b);
            return {frames:steps.length,medianFrameMs:steps[Math.floor(steps.length/2)],
               p95FrameMs:steps[Math.floor(steps.length*.95)]};
        }""")
        cdp_metrics={m["name"]:m["value"] for m in cdp.send("Performance.getMetrics")["metrics"]}
        # Exercise the actual UI save, then perform a complete browser reload.
        page.locator("#save").click()
        page.reload(wait_until="load",timeout=90000)
        loaded=page.evaluate("""() => {
            const s=HOG_APP_DEBUG.getState();
            return {race:s?.race,version:s?.version,strict:HOG_ENGINE.strictSave(s)};
        }""")
        check(name+" cold browser reload preserves canonical Save v07",
              loaded["race"]==race and loaded["version"]==7 and loaded["strict"],loaded)
        check(name+" no uncaught browser errors",
              not any(e["viewport"]==name for e in errors),errors)
        shot=SHOTS/(name+"-game.png")
        page.screenshot(path=str(shot),animations="disabled")
        screenshots.append({"path":str(shot.relative_to(ROOT)),
             "sha256":hashlib.sha256(shot.read_bytes()).hexdigest()})
        results.append({"viewport":name,"width":w,"height":h,"emulated_android_viewport":mobile,
             "navigation_wall_ms":navigation_ms,"document_load_timing":js["navigation"],
             "JSHeapUsedBytes":round(cdp_metrics.get("JSHeapUsedSize",0)),
             "JSHeapTotalBytes":round(cdp_metrics.get("JSHeapTotalSize",0)),
             "DOMNodes":round(cdp_metrics.get("Nodes",0)),
             "layout_count":round(cdp_metrics.get("LayoutCount",0)),
             "frame_sample":frames})
        print("HG55 METRIC "+json.dumps(results[-1],ensure_ascii=False),flush=True)
        ctx.close()
    browser.close()
print("HG55 CHROMIUM",sum(x["pass"] for x in checks),"/",len(checks),flush=True)
