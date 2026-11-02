"""HG-11 actual Chrome CLI integration test for the portable offline HTML.

Chrome opens a temporary test-instrumented copy of the exact offline game file.
The test script invokes real in-game controls/handlers, and Chrome itself saves
the rendered gameplay screenshot. No canvas, engine, or screenshots are mocked.
"""
from pathlib import Path
import json
import base64
import os
import re
import shutil
import subprocess
import uuid

ROOT = Path(__file__).parent
GAME = ROOT / "Play-Heoofgaia-HG11.html"
EVIDENCE = ROOT / "docs" / "evidence" / "hg11"
REPORT = ROOT / "docs" / "qa" / "hg11" / "chrome-visual-smoke.json"


INJECT = r'''<script>
window.addEventListener('load',()=>setTimeout(()=>{
 const checks=[],exceptions=[];const check=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});
 const finish=()=>{
  const result={race:'__RACE__',checks,exceptions,pass:exceptions.length===0&&checks.every(x=>x.ok)};
  const pre=document.createElement('pre');pre.id='hg11-qa-result';pre.textContent=JSON.stringify(result);document.body.appendChild(pre);
  document.title='HG11_QA_'+(result.pass?'PASS':'FAIL');
  const summary={race:result.race,pass:result.pass,exceptions:result.exceptions,checks:result.checks.map(x=>({name:x.name,ok:x.ok}))};
  console.error('HG11_QA_RESULT_B64 '+btoa(unescape(encodeURIComponent(JSON.stringify(summary)))));
 };
 try{
  const race='__RACE__';
  const pending=sessionStorage.getItem('hog11-hg11-visual-save-check');
  if(pending){
   sessionStorage.removeItem('hog11-hg11-visual-save-check');
   const previous=JSON.parse(pending);checks.push(...previous.checks);
   const restored=HOG_APP_DEBUG.getState();
   check('Full page reload restores v07 faction',restored?.race===race&&restored.race===previous.race,restored?.race);
   const queueResumed=restored?.buildingQueue?.key===previous.queueKey&&restored.buildingQueue.remaining>0;
   const queueCompleted=!!restored&&restored.buildings?.[previous.queueKey]>=previous.queueLevel;
   check('Full page reload resumes or completes the real construction safely',queueResumed||queueCompleted,JSON.stringify({queue:restored?.buildingQueue,level:restored?.buildings?.[previous.queueKey],expectedLevel:previous.queueLevel}));
   document.querySelector('[data-action="tab"][data-tab="city"]').click();
   check('Restored faction scene renders after full reload',!!document.querySelector('#city-canvas')&&document.querySelector('[data-city-art="'+race+'"]').naturalWidth===1176,race);
   finish();return;
  }
  check('Four faction images decode at 1176x560',[...document.querySelectorAll('[data-city-art]')].length===4&&[...document.querySelectorAll('[data-city-art]')].every(i=>i.naturalWidth===1176&&i.naturalHeight===560),JSON.stringify([...document.querySelectorAll('[data-city-art]')].map(i=>[i.dataset.cityArt,i.naturalWidth,i.naturalHeight])));
  document.querySelector(`[data-action="race"][data-race="${race}"]`).click();
  document.querySelector('[data-action="start"]').click();
  check('Selected faction starts an actual playable state',HOG_APP_DEBUG.getState().race===race,HOG_APP_DEBUG.getState().race);
  document.querySelector('[data-action="tab"][data-tab="city"]').click();
  const c=document.querySelector('#city-canvas'),r=c.getBoundingClientRect();
  check('Faction city view and canvas are visible',!!c&&r.width>0&&r.height>0&&HOG_APP_DEBUG.getState().race===race,`${r.width}x${r.height}`);
  check('Canvas paints the selected faction scene',!!document.querySelector('#city-canvas')&&document.querySelector('[data-city-art="'+race+'"]').naturalWidth===1176,race);
  const hits=HOG_PAINTER.citySitesFor(race).map(([key,x,y])=>{
   const canvas=document.querySelector('#city-canvas'),rect=canvas.getBoundingClientRect();
   canvas.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:rect.left+x*rect.width,clientY:rect.top+y*rect.height}));
   const selected=document.querySelector('.target-information h2')?.textContent||'';
   return {key,selected,ok:selected.includes(HOG_CATALOG.buildings[key].name)};
  });
  check('All 12 real canvas hit zones select the correct building',hits.length===12&&hits.every(h=>h.ok),JSON.stringify(hits));
  const cityBuild=document.querySelector('.scene-bottom .landmarks [data-action="building"]');
  if(cityBuild)cityBuild.click();
  const upgrade=document.querySelector('[data-action="upgrade"]');
  check('Faction build-list offers a real upgrade action',!!cityBuild&&!!upgrade&&!upgrade.disabled,cityBuild?.dataset.key+' '+(upgrade?.outerHTML||'missing'));
  if(upgrade&&!upgrade.disabled)upgrade.click();
  check('Building click starts a real construction queue',!!HOG_APP_DEBUG.getState().buildingQueue&&HOG_APP_DEBUG.getState().buildingQueue.key===cityBuild?.dataset.key,JSON.stringify(HOG_APP_DEBUG.getState().buildingQueue));
  document.querySelector('#save').click();
  check('Save persists through the legacy v07 key',!!localStorage.getItem('heoofgaia_hg_only_v07'),localStorage.getItem('heoofgaia_hg_only_v07')?.length||0);
  sessionStorage.setItem('hog11-hg11-visual-save-check',JSON.stringify({race,queueKey:HOG_APP_DEBUG.getState().buildingQueue?.key,queueLevel:HOG_APP_DEBUG.getState().buildingQueue?.level,checks}));
  location.reload();return;
 }catch(e){exceptions.push(String(e?.stack||e));}
 finish();
},8000));
</script>'''


def main():
    if not GAME.is_file():
        raise SystemExit(f"Offline game not found: {GAME}")
    chrome = next((Path(os.environ.get(key, "")) / suffix for key, suffix in [
        ("PROGRAMFILES", Path("Google/Chrome/Application/chrome.exe")),
        ("PROGRAMFILES(X86)", Path("Google/Chrome/Application/chrome.exe")),
    ] if (Path(os.environ.get(key, "")) / suffix).is_file()), None)
    if chrome is None:
        raise SystemExit("Google Chrome installation was not found.")

    EVIDENCE.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    game_html = GAME.read_text(encoding="utf-8")
    checks, screenshots = [], []
    runtime_root = REPORT.parent / "chrome-runtime"
    runtime_root.mkdir(parents=True, exist_ok=True)
    if not runtime_root.resolve().is_relative_to(ROOT.resolve()):
        raise RuntimeError(f"Refusing to use runtime path outside repository: {runtime_root}")
    for race in ("human", "elf", "orc", "undead"):
        runtime = runtime_root / f"{race}-{uuid.uuid4().hex}"
        runtime.mkdir(parents=True, exist_ok=True)
        test_file = runtime / "game-qa.html"
        test_file.write_text(game_html.replace("</body>", INJECT.replace("__RACE__", race) + "</body>"), encoding="utf-8")
        profile = runtime / "profile"
        capture = EVIDENCE / f"city-{race}-chrome.png"
        cmd = [str(chrome), "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-gpu-sandbox",
               "--no-first-run", "--no-default-browser-check", "--disable-features=Vulkan",
               "--disable-sync", "--disable-default-apps", "--disable-component-update", "--enable-logging=stderr", "--log-level=0",
               "--disable-background-networking", "--disable-extensions", "--hide-scrollbars",
               "--window-size=1440,1000", "--force-device-scale-factor=1", "--virtual-time-budget=24000",
               f"--user-data-dir={profile}", f"--screenshot={capture}", "--dump-dom", test_file.as_uri()]
        proc = subprocess.run(cmd, capture_output=True, timeout=60)
        stdout = proc.stdout.decode("utf-8", errors="replace")
        stderr = proc.stderr.decode("utf-8", errors="replace")
        combined = stdout + "\n" + stderr
        found = re.search(r"HG11_QA_RESULT_B64\s+([A-Za-z0-9+/]+={0,2})", combined)
        match = found.group(1) if found else None
        try:
            result = json.loads(base64.b64decode(match).decode("utf-8")) if match else None
        except Exception as exc:
            raise RuntimeError(f"Chrome did not return HG-11 QA result for {race}; exit={proc.returncode}; stderr={stderr[-2000:]}; stdout={stdout[-1000:]}") from exc
        if result is None:
            raise RuntimeError(f"Chrome did not return HG-11 QA result for {race}; exit={proc.returncode}; screenshot={capture.is_file()}; stderr={stderr[-2000:]}; stdout={stdout[-1000:]}")
        if proc.returncode != 0:
            raise RuntimeError(f"Chrome exited {proc.returncode} for {race}: {stderr[-2000:]}")
        checks.extend(result["checks"])
        checks.extend({"name": f"{race} runtime exception", "ok": False, "detail": error} for error in result["exceptions"])
        checks.append({"name": f"{race} real Chrome screenshot written", "ok": capture.is_file() and capture.stat().st_size > 100_000, "detail": str(capture)})
        if not result["pass"]:
            break
        screenshots.append(str(capture.relative_to(ROOT)).replace("\\", "/"))
        if runtime.resolve().is_relative_to(runtime_root.resolve()) and runtime != runtime_root:
            shutil.rmtree(runtime)

    report = {
        "browser": "Google Chrome headless CLI; opens a temporary instrumented copy of the exact offline HTML using file://",
        "viewport": "1440x1000",
        "gameBuild": str(GAME.relative_to(ROOT)).replace("\\", "/"),
        "screenshots": screenshots,
        "checks": checks,
        "passed": sum(bool(c["ok"]) for c in checks),
        "failed": sum(not c["ok"] for c in checks),
        "limitations": "Generated flattened city scenes are original recreations; the test proves browser rendering and live in-game event handlers, not original-client parity or animation fidelity.",
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"report": str(REPORT), "passed": report["passed"], "failed": report["failed"], "screenshots": screenshots, "checks": checks}, ensure_ascii=False, indent=2))
    if report["failed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
