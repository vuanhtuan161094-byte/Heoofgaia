"""Real Chrome file:// acceptance for three concurrent hero expeditions."""
from pathlib import Path
import base64
import json
import os
import re
import shutil
import subprocess
import uuid

ROOT = Path(__file__).parent
GAME = ROOT / "Play-Heoofgaia-HG11.html"
EVIDENCE = ROOT / "docs" / "evidence" / "hg10"
REPORT = ROOT / "docs" / "qa" / "hg10" / "parallel-three-hero-chrome.json"
SHOT = EVIDENCE / "parallel-three-hero-marches-reloaded-chrome.png"

INJECT = r'''<script>
window.addEventListener('load',()=>setTimeout(async()=>{
 const checks=[],exceptions=[];const check=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});
 const finish=()=>{
  const result={checks,exceptions,pass:exceptions.length===0&&checks.every(x=>x.ok)};
  const pre=document.createElement('pre');pre.id='hog10-parallel-result';pre.style.display='none';pre.textContent=JSON.stringify(result);document.body.appendChild(pre);
  document.title='HOG10_PARALLEL_'+(result.pass?'PASS':'FAIL');
  const summary={pass:result.pass,exceptions,checks};
  console.error('HOG10_PARALLEL_RESULT_B64 '+btoa(unescape(encodeURIComponent(JSON.stringify(summary)))));
 };
 try{
  const prior=sessionStorage.getItem('hog10-parallel-reload');
  if(prior){
   sessionStorage.removeItem('hog10-parallel-reload');const saved=JSON.parse(prior);checks.push(...saved.checks);
   const s=HOG_APP_DEBUG.getState(),routes=[{hero:s?.expedition?.heroId,target:s?.march?.target},...(s?.parallelMarches||[]).map(q=>({hero:q.heroId,target:q.target}))];
   check('Full browser reload restores all three in-flight hero routes',s?.version===7&&routes.length===3&&JSON.stringify(routes.map(x=>x.hero))==='[1,2,3]'&&JSON.stringify(routes.map(x=>x.target))===JSON.stringify(saved.targets),JSON.stringify(routes));
   check('Reloaded v07 save passes strict validation without troop duplication',!!s&&HOG_ENGINE.strictSave(s)&&s.army.human_1===4,JSON.stringify({army:s?.army?.human_1,valid:s&&HOG_ENGINE.strictSave(s)}));
   const brand=document.querySelector('.brand')?.textContent?.trim()||'';check('Game title remains Anh Hùng Thời Loạn after reload',brand==='ANH HÙNG THỜI LOẠN',brand);
   finish();return;
  }
  check('Offline build opens the v07 game engine',document.readyState==='complete'&&HOG_ENGINE.V===7,`${document.title} · v${HOG_ENGINE.V}`);
  document.querySelector('[data-action="start"]').click();
  const s=HOG_APP_DEBUG.getState();s.fame=2200;HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
  check('Start creates a real kingdom; test Fame enables the dated three-hero hire threshold',s.heroes.length===1&&HOG_ENGINE.heroCountLimit(s.fame)>=3,'Fame is the only seeded field; roster and recruitment use the live game system.');
  document.querySelector('[data-action="tab"][data-tab="heroes"]').click();
  for(let i=0;i<2;i++){
   const hire=document.querySelector('[data-action="hirecandidate"]:not([disabled])');if(hire)hire.click();
   check(`Tavern control recruits hero ${i+2}`,HOG_APP_DEBUG.getState().heroes.length===i+2,`heroes=${HOG_APP_DEBUG.getState().heroes.length}`);
  }
  const roster=HOG_APP_DEBUG.getState();check('Three hired heroes produce a valid v07 state',roster.heroes.length===3&&HOG_ENGINE.strictSave(roster),`${roster.heroes.map(h=>h.name).join(', ')} · strict=${HOG_ENGINE.strictSave(roster)}`);
  document.querySelector('#speed').click();check('Live speed control sets travel to 1x for the in-flight save',HOG_APP_DEBUG.getState().speed===1,String(HOG_APP_DEBUG.getState().speed));
  document.querySelector('[data-action="tab"][data-tab="map"]').click();
  const destinations=HOG_ENGINE.TILES.filter(t=>t.kind==='npc'&&HOG_ENGINE.pathfind('3,4',t.key)).slice(0,3);
  check('Three distinct reachable neutral targets exist',destinations.length===3,JSON.stringify(destinations.map(t=>t.key)));
  function selectOnMap(tile){
   const canvas=document.querySelector('#world-canvas');canvas.setPointerCapture=()=>{};
   const rect=canvas.getBoundingClientRect(),mini=HOG_PAINTER.miniBounds(canvas),pad=9;
   const x=mini.x+pad+(tile.x+.5)*(mini.w-2*pad)/HOG_ENGINE.WIDTH,y=mini.y+pad+(tile.y+.5)*(mini.h-2*pad)/HOG_ENGINE.HEIGHT;
   const event={clientX:rect.left+x*rect.width/canvas.width,clientY:rect.top+y*rect.height/canvas.height,pointerId:1};
   canvas.onpointerdown(event);canvas.onpointerup(event);
   return document.querySelector('.target-information h2')?.textContent||'';
  }
  function prepareArmy(){
   document.querySelector('[data-action="tab"][data-tab="army"]').click();
   const unit=document.querySelector('#formation_unit_0'),count=document.querySelector('#formation_count_0');unit.value='human_1';count.value='4';
   document.querySelector('[data-action="formation"]').click();
   return HOG_APP_DEBUG.getState().formation.some(g=>g.unitId==='human_1'&&g.count===4);
  }
  const targets=[];
  for(let i=0;i<3;i++){
   if(i>0){document.querySelector('[data-action="tab"][data-tab="heroes"]').click();document.querySelector(`[data-action="hero"][data-id="${i+1}"]`).click();}
   const formationReady=prepareArmy();check(`Army UI assigns four actual starting troops for hero ${i+1}`,formationReady);
   document.querySelector('[data-action="tab"][data-tab="map"]').click();
   const selected=selectOnMap(destinations[i]);targets.push(destinations[i].key);
   check(`World minimap selects NPC ${destinations[i].key}`,!!selected,selected);
   const button=document.querySelector('[data-action="march"]:not([disabled])');if(button)button.click();
   const after=HOG_APP_DEBUG.getState();
   const dispatched=i===0?after.expedition?.heroId:after.parallelMarches[i-1]?.heroId;
   check(`Live March control sends hero ${i+1}`,!!after.march&&after.march.phase==='outbound'&&after.parallelMarches.length===i&&dispatched===i+1,JSON.stringify({hero:dispatched,primary:after.march?.heroId,queued:after.parallelMarches.length,phase:after.march?.phase}));
  }
  const live=HOG_APP_DEBUG.getState(),routes=[{hero:live.expedition.heroId,target:live.march.target},...live.parallelMarches.map(q=>({hero:q.heroId,target:q.target}))];
  check('Three heroes travel concurrently to unique targets with AP and troops charged once',routes.length===3&&new Set(routes.map(x=>x.hero)).size===3&&new Set(routes.map(x=>x.target)).size===3&&live.army.human_1===4&&live.ap===76&&HOG_ENGINE.strictSave(live),JSON.stringify({routes,army:live.army.human_1,ap:live.ap,valid:HOG_ENGINE.strictSave(live)}));
  const marchButton=document.querySelector('[data-action="march"]');check('UI blocks a fourth dispatch at three heroes',marchButton?.disabled&&/3 tướng/.test(marchButton.textContent),JSON.stringify({disabled:marchButton?.disabled,label:marchButton?.textContent}));
  const ledger=document.querySelector('.expedition-ledger')?.textContent||'';check('World screen renders the live three-hero expedition ledger',ledger.includes('3/3')&&ledger.includes('Seren')&&ledger.includes('Cerys'),ledger);
  document.querySelector('#save').click();check('Save control writes the actual v07 browser save',!!localStorage.getItem(HOG_ENGINE.SAVE_KEY));
  sessionStorage.setItem('hog10-parallel-reload',JSON.stringify({checks,targets}));location.reload();return;
 }catch(e){exceptions.push(String(e?.stack||e));}
 finish();
},500));
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
    runtime_root = REPORT.parent / "chrome-runtime"
    runtime_root.mkdir(parents=True, exist_ok=True)
    if not runtime_root.resolve().is_relative_to(ROOT.resolve()):
        raise RuntimeError(f"Refusing to use runtime path outside repository: {runtime_root}")
    runtime = runtime_root / f"parallel-{uuid.uuid4().hex}"
    runtime.mkdir(parents=True, exist_ok=True)
    test_file = runtime / "game-qa.html"
    test_file.write_text(GAME.read_text(encoding="utf-8").replace("</body>", INJECT + "</body>"), encoding="utf-8")
    profile = runtime / "profile"
    try:
        command = [str(chrome), "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-gpu-sandbox",
                   "--no-first-run", "--no-default-browser-check", "--disable-features=Vulkan", "--disable-sync",
                   "--disable-default-apps", "--disable-component-update", "--disable-background-networking",
                   "--disable-extensions", "--hide-scrollbars", "--run-all-compositor-stages-before-draw",
                   "--enable-logging=stderr", "--log-level=0", "--window-size=1440,1400",
                   "--force-device-scale-factor=1", "--virtual-time-budget=12000", f"--user-data-dir={profile}",
                   f"--screenshot={SHOT}", "--dump-dom", test_file.as_uri()]
        result = subprocess.run(command, capture_output=True, timeout=60)
        output = result.stdout.decode("utf-8", errors="replace") + "\n" + result.stderr.decode("utf-8", errors="replace")
        found = re.search(r"HOG10_PARALLEL_RESULT_B64\s+([A-Za-z0-9+/]+={0,2})", output)
        summary = json.loads(base64.b64decode(found.group(1)).decode("utf-8")) if found else None
        if result.returncode != 0 or summary is None:
            raise RuntimeError(f"Chrome did not finish parallel expedition QA; exit={result.returncode}; stderr={output[-3000:]}")
        checks = summary["checks"]
        checks.append({"name": "Chrome page reports no JavaScript exceptions", "ok": not summary["exceptions"], "detail": "; ".join(summary["exceptions"])})
        checks.append({"name": "Real Chrome gameplay screenshot written", "ok": SHOT.is_file() and SHOT.stat().st_size > 100_000, "detail": str(SHOT)})
        report = {"date": "2026-11-03", "browser": "Installed Google Chrome headless CLI opening a temporary copy of the exact offline game via file://", "viewport": "1440x1400",
                  "gameBuild": str(GAME.relative_to(ROOT)).replace("\\", "/"), "checks": checks,
                  "passed": sum(bool(c["ok"]) for c in checks), "failed": sum(not c["ok"] for c in checks),
                  "exceptions": summary["exceptions"], "screenshot": str(SHOT.relative_to(ROOT)).replace("\\", "/"),
                  "limitations": "Fame 2,200 is seeded as a QA fixture to unlock the dated hero roster threshold. Tavern recruitment, troop formation, minimap selection, three March actions, UI cap and v07 reload use the real game controls. Only pointer capture is bypassed for synthetic minimap pointer events; the actual application pointer handlers execute.",
                  "checksPass": summary["pass"]}
        REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"passed": report["passed"], "failed": report["failed"], "screenshot": report["screenshot"], "checks": checks}, ensure_ascii=True, indent=2))
        if report["failed"]:
            raise SystemExit(1)
    finally:
        if runtime.resolve().is_relative_to(runtime_root.resolve()) and runtime != runtime_root:
            shutil.rmtree(runtime)


if __name__ == "__main__":
    main()
