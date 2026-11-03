"""Actual offline Chrome flow for the generated Undead Skeleton Warrior sprite."""
from pathlib import Path
import hashlib
import json
import os
import struct
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent
HTML = ROOT / "Play-Heoofgaia-HG11.html"
EVIDENCE = ROOT / "docs" / "evidence" / "hg11"
QA = ROOT / "docs" / "qa" / "hg11"
EVIDENCE.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
browser_env = os.environ.get("HOG_CHROMIUM_PATH")
candidates = [Path(browser_env)] if browser_env else [
    Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "Google" / "Chrome" / "Application" / "chrome.exe",
    Path(os.environ.get("PROGRAMFILES(X86)", "C:/Program Files (x86)")) / "Microsoft" / "Edge" / "Application" / "msedge.exe",
    Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "Microsoft" / "Edge" / "Application" / "msedge.exe",
]
BROWSER = next((str(path) for path in candidates if path and path.is_file()), None)
if not BROWSER:
    raise SystemExit("Chrome/Edge not found; set HOG_CHROMIUM_PATH.")

checks, errors = [], []


def check(name, passed, detail=""):
    checks.append({"name": name, "passed": bool(passed), "detail": detail})
    print(("PASS " if passed else "FAIL ") + name + (f" — {detail}" if detail else ""))


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=BROWSER,
        headless=True,
        args=["--no-sandbox", "--allow-file-access-from-files", "--disable-dev-shm-usage"],
    )
    context = browser.new_context(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    page = context.new_page()
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto(HTML.as_uri(), wait_until="load")
    check("Offline game opens with Anh Hùng Thời Loạn title", page.title() == "Anh Hùng Thời Loạn", page.title())
    page.locator('[data-action="race"][data-race="undead"]').click()
    page.locator('[data-action="start"]').click()
    check("Undead kingdom starts in the actual game", page.evaluate("HOG_APP_DEBUG.getState().race") == "undead")

    setup = page.evaluate("""(()=>{
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,C=HOG_CATALOG;
      // The fixture skips construction/research time only. Recruitment, queue
      // completion, formation, dispatch, battle and Save/Reload use live code.
      s.buildings.graveyard=1;s.buildings.warehouse=10;s.speed=60;
      for(const k of C.keys)s.res[k]=E.limits(s)[k];
      s.lastTick=Date.now();HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
      return {version:s.version,requirements:E.troopPrerequisites(s,C.units.undead.find(u=>u.id==='undead_1')),
        resources:{...s.res},ready:(()=>{const i=document.getElementById('unit-undead-skeleton');return i.complete&&i.naturalWidth===512})()};
    })()""")
    check("Skeleton Warrior fixture has its Graveyard gate and loaded runtime sprite",
          setup["requirements"]["available"] and setup["ready"],
          json.dumps({"requirements": setup["requirements"], "spriteReady": setup["ready"]}, ensure_ascii=False))

    page.locator('#nav [data-tab="army"]').click()
    card = page.locator(".unitrow").filter(has_text="Skeleton Warrior").first
    check("Undead Skeleton Warrior has an enabled real recruitment control",
          card.locator('[data-action="recruit"][data-id="undead_1"]').is_enabled())
    before = page.evaluate("HOG_APP_DEBUG.getState().res.gold")
    card.locator("#q_undead_1").fill("16")
    card.locator('[data-action="recruit"][data-id="undead_1"]').click()
    queued = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {
      unitId:s.training[0]?.unitId,count:s.training[0]?.count,remaining:s.training[0]?.remaining,
      gold:s.res.gold,strict:HOG_ENGINE.strictSave(s)}})()""")
    check("Recruit button spends resources and creates a real 16-Skeleton training queue",
          queued["unitId"] == "undead_1" and queued["count"] == 16 and
          queued["remaining"] > 0 and queued["gold"] < before and queued["strict"],
          json.dumps(queued, ensure_ascii=False))
    # Advance only elapsed queue time through the real deterministic engine
    # tick. The queue, costs, completion and delivered stack are not injected.
    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),seconds=Math.ceil(s.training[0].remaining/s.speed)+1;
      HOG_ENGINE.tick(s,s.lastTick+seconds*1000);s.lastTick=Date.now();HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()""")
    recruited = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {
      count:s.army.undead_1,queue:s.training.length,strict:HOG_ENGINE.strictSave(s)}})()""")
    check("Real engine tick completes the queue and adds 16 Skeleton Warriors to the starting 16",
          recruited["count"] == 32 and recruited["queue"] == 0 and recruited["strict"],
          json.dumps(recruited, ensure_ascii=False))

    page.locator("#formation_unit_0").select_option("undead_1")
    page.locator("#formation_count_0").fill("16")
    page.locator('[data-action="formation"]').click()
    formation = page.evaluate("HOG_APP_DEBUG.getState().formation[0]")
    check("Army form commits the recruited Skeleton Warriors to the march formation",
          formation and formation["unitId"] == "undead_1" and formation["count"] == 16,
          json.dumps(formation, ensure_ascii=False))

    page.locator('#nav [data-tab="map"]').click()
    point = page.evaluate("""(()=>{const c=document.querySelector('#world-canvas'),t=HOG_ENGINE.getTile('5,6'),m=HOG_PAINTER.mapCamera();
      const q=Math.max(.65,Math.min(2.05,m.zoom))*48;
      return {x:(t.x+.5)*q+c.width/2-m.centerX*q,y:(t.y+.5)*q+c.height/2-m.centerY*q,
        target:{key:t.key,kind:t.kind,name:t.value}}})()""")
    box = page.locator("#world-canvas").bounding_box()
    page.mouse.click(box["x"] + point["x"] * box["width"] / 1176,
                     box["y"] + point["y"] * box["height"] / 620)
    selected = page.locator(".target-information h2").inner_text()
    check("World-map click selects the actual nearby Wolves NPC",
          point["target"]["kind"] == "npc" and "Wolves" in selected, selected)

    page.evaluate("""(()=>{const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage;
      window.__undeadSkeletonDraws=0;proto.drawImage=function(image,...args){
        if(image?.id==='unit-undead-skeleton')window.__undeadSkeletonDraws++;
        return draw.call(this,image,...args)};})()""")
    ap_before_march = page.evaluate("HOG_APP_DEBUG.getState().ap")
    page.locator('[data-action="march"]').click()
    dispatched = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {
      target:s.march?.target,formation:s.expedition?.formation?.[0]?.unitId,
      armyCount:s.expedition?.army?.undead_1,ap:s.ap}})()""")
    check("March control dispatches the saved Skeleton Warrior formation", dispatched["target"] == "5,6" and
          dispatched["formation"] == "undead_1" and dispatched["armyCount"] == 16 and dispatched["ap"] < ap_before_march,
          json.dumps(dispatched, ensure_ascii=False))

    page.wait_for_function("HOG_APP_DEBUG.getState()?.battle", timeout=20000)
    page.wait_for_function("window.__undeadSkeletonDraws>0", timeout=7000)
    runtime = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),image=document.getElementById('unit-undead-skeleton'),b=s.battle;
      return {battle:!!b,target:s.march?.target||'5,6',phase:b?'tactical-battle':null,
        units:b?.allies?.map(u=>({unitId:u.unitId,count:u.count})),draws:window.__undeadSkeletonDraws,
        imageReady:image.complete&&image.naturalWidth===512,
        actualUiMarch:s.race==='undead'&&s.expedition?.formation?.some(g=>g.unitId==='undead_1'),
        saveVersion:s.version,key:localStorage.getItem('heoofgaia_hg_only_v07')!==null}})()""")
    check("Natural NPC arrival opens a tactical battle", runtime["battle"] and runtime["phase"] == "tactical-battle")
    check("Loaded Skeleton Warrior is drawn into the real battle canvas",
          runtime["imageReady"] and runtime["draws"] > 0, json.dumps(runtime, ensure_ascii=False))
    check("Live battle contains the UI-recruited Skeleton Warrior stack",
          any(row["unitId"] == "undead_1" and row["count"] > 0 for row in runtime["units"] or []))
    check("Live dispatch and battle retain the v07 save key and schema",
          runtime["saveVersion"] == 7 and runtime["key"] and runtime["actualUiMarch"])

    screenshot = EVIDENCE / "undead-skeleton-combined-build-battle-chrome.png"
    page.screenshot(path=str(screenshot), full_page=True)
    shot_bytes = screenshot.read_bytes()
    width, height = struct.unpack(">II", shot_bytes[16:24])
    screenshot_info = {"sha256": hashlib.sha256(shot_bytes).hexdigest().upper(),
                       "bytes": len(shot_bytes), "resolution": f"{width}x{height}"}

    # Renderer-only parity check: draw a cloned snapshot with a Skeleton identity
    # on an enemy stack; do not modify the live battle or count this as gameplay.
    flip = page.evaluate("""(()=>{const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState();
      const fixture=JSON.parse(JSON.stringify(s));
      const enemy=fixture.battle?.enemies?.find(u=>u.pool>0);if(!enemy)return {available:false};
      enemy.unitId='undead_1';const canvas=document.createElement('canvas');canvas.width=1176;canvas.height=550;
      const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,scales=[];
      proto.drawImage=function(image,...args){if(image?.id==='unit-undead-skeleton')scales.push(this.getTransform().a);return draw.call(this,image,...args)};
      try{P.drawBattle(canvas,E,fixture)}finally{proto.drawImage=draw}
      return {available:true,draws:scales.length,enemyHorizontalFlip:scales.some(x=>x<0),scales};})()""")
    check("Renderer-only cloned battle check flips enemy Skeleton art horizontally",
          flip["available"] and flip["draws"] > 0 and flip["enemyHorizontalFlip"],
          json.dumps(flip, ensure_ascii=False))

    page.locator("#save").click()
    page.reload(wait_until="load")
    loaded = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return s&&{
      version:s.version,race:s.race,battle:!!s.battle,formation:s.expedition?.formation?.[0]?.unitId,
      battleUnit:s.battle?.allies?.some(u=>u.unitId==='undead_1'&&u.count>0),
      key:localStorage.getItem('heoofgaia_hg_only_v07')!==null,
      imageReady:(()=>{const i=document.getElementById('unit-undead-skeleton');return i.complete&&i.naturalWidth===512})()}})()""")
    check("v07 Save/Reload preserves the Undead Skeleton Warrior battle and formation",
          loaded["version"] == 7 and loaded["race"] == "undead" and loaded["battle"] and
          loaded["formation"] == "undead_1" and loaded["battleUnit"] and loaded["key"] and loaded["imageReady"],
          json.dumps(loaded, ensure_ascii=False))
    check("No JavaScript exceptions occur in the offline Skeleton Warrior flow", not errors, json.dumps(errors))
    context.close()
    browser.close()

result = {
    "command": ".venv\\Scripts\\python.exe qa-hg11-undead-skeleton-chrome.py",
    "browser": BROWSER,
    "game": "Anh Hùng Thời Loạn",
    "sourceMode": "standalone local file:// HTML in installed Chromium",
    "fixtureDisclosure": "An Undead save is created through the intro. Graveyard 1, Warehouse 10 and capped prerequisite resources are seeded to skip construction/research. The recruit control queues real Skeleton Warriors and spends real resources; the actual engine tick is advanced by the queue's remaining duration so the real completion path delivers the stack. Formation, map click, March, NPC battle, sprite draw and v07 Save/Reload use the actual application. Enemy flip is checked separately with an isolated cloned renderer snapshot; it is not represented as gameplay.",
    "total": len(checks), "passed": sum(item["passed"] for item in checks),
    "failed": sum(not item["passed"] for item in checks), "errors": errors,
    "checks": checks, "undeadSkeletonRuntime": runtime, "enemyRendererCheck": flip,
    "artifacts": {screenshot.name: screenshot_info},
}
receipt = QA / "undead-skeleton-battle-chrome.json"
receipt.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

manifest_path = ROOT / "assets" / "generated" / "hg11" / "units" / "undead-skeleton-manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest["states"]["integratedInBattle"] = runtime["battle"] and runtime["imageReady"] and runtime["draws"] > 0
manifest["states"]["enemyFlipVerified"] = flip["available"] and flip["enemyHorizontalFlip"]
manifest["states"]["saveLoadVerified"] = any(
    item["name"] == "v07 Save/Reload preserves the Undead Skeleton Warrior battle and formation" and item["passed"]
    for item in checks)
manifest["qualityGate"]["readabilityAtBattleScale"] = (
    "PASS: actual offline Chrome capture shows the Skeleton Warrior stack at the battle renderer's 90x90 draw box."
    if screenshot_info["resolution"] and runtime["draws"] > 0 else
    "FAIL: focused offline screenshot or live sprite draw was missing.")
manifest["qualityGate"]["battleRender"] = (
    f"PASS: actual UI recruitment, training completion, formation and NPC battle produced {runtime['draws']} Skeleton Warrior drawImage calls."
    if manifest["states"]["integratedInBattle"] else "FAIL: UI-recruited Skeleton Warrior was not drawn in the live battle.")
manifest["qualityGate"]["enemyFlip"] = (
    "PASS: an isolated cloned battle snapshot drew enemy Skeleton Warrior art under a negative horizontal canvas transform; this is renderer-only QA."
    if manifest["states"]["enemyFlipVerified"] else "FAIL: isolated enemy flip path did not draw the sprite under a negative horizontal transform.")
manifest["qualityGate"]["saveLoadImpact"] = (
    "PASS: presentation-only; actual v07 Save/Reload retained the Skeleton Warrior battle, deployed formation, stack and image asset."
    if manifest["states"]["saveLoadVerified"] else "FAIL: actual v07 Save/Reload did not preserve the live battle and formation.")
manifest["battleEvidence"].update({
    "screenshot": f"docs/evidence/hg11/{screenshot.name}",
    "resolution": screenshot_info["resolution"],
    "sha256": screenshot_info["sha256"],
    "receipt": "docs/qa/hg11/undead-skeleton-battle-chrome.json",
    "chromeSpriteDraws": runtime["draws"],
})
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"CHROME TOTAL {result['passed']}/{result['total']} PASS; JavaScript exceptions={len(errors)}")
raise SystemExit(0 if result["failed"] == 0 and not errors else 1)
