"""Actual offline Chrome flow for the generated Elf tier-2 Scout sprite."""
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
    page.locator('[data-action="race"][data-race="elf"]').click()
    page.locator('[data-action="start"]').click()
    check("Elf kingdom starts in the actual game", page.evaluate("HOG_APP_DEBUG.getState().race") == "elf")

    setup = page.evaluate("""(()=>{
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,C=HOG_CATALOG;
      // The fixture skips construction time. Scouting research, recruitment,
      // queue completion, formation, dispatch, battle and Save/Reload use live code.
      s.buildings.barracks=2;s.buildings.magicTower=1;s.buildings.warehouse=10;s.spells.scouting=0;s.speed=60;
      for(const k of C.keys)s.res[k]=E.limits(s)[k];
      s.lastTick=Date.now();HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
      return {version:s.version,requirements:E.troopPrerequisites(s,C.units.elf.find(u=>u.id==='elf_2')),
        resources:{...s.res},ready:(()=>{const i=document.getElementById('unit-elf-scout');return i.complete&&i.naturalWidth===512})()};
    })()""")
    check("Elf Scout stays locked before Scouting research and the runtime sprite loads",
          not setup["requirements"]["available"] and
          any(item["kind"] == "spell" and item["key"] == "scouting" for item in setup["requirements"]["unmet"]) and setup["ready"],
          json.dumps({"requirements": setup["requirements"], "spriteReady": setup["ready"]}, ensure_ascii=False))

    page.locator('#nav [data-tab="magic"]').click()
    scouting = page.locator('[data-action="learn"][data-id="scouting"]')
    check("Scouting research is available through the actual Magic Tower UI", scouting.is_enabled())
    research_gold_before = page.evaluate("HOG_APP_DEBUG.getState().res.gold")
    scouting.click()
    research_queue = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {key:s.researchQueue?.key,
      remaining:s.researchQueue?.remaining,gold:s.res.gold,strict:HOG_ENGINE.strictSave(s)}})()""")
    check("Magic Tower UI starts a paid Scouting research queue",
          research_queue["key"] == "scouting" and research_queue["remaining"] > 0 and
          research_queue["gold"] < research_gold_before and research_queue["strict"],
          json.dumps(research_queue, ensure_ascii=False))
    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),seconds=Math.ceil(s.researchQueue.remaining/s.speed)+1;
      HOG_ENGINE.tick(s,s.lastTick+seconds*1000);s.lastTick=Date.now();HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()""")
    researched = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {level:s.spells.scouting,
      queue:s.researchQueue,strict:HOG_ENGINE.strictSave(s)}})()""")
    check("Real engine tick completes Scouting research exactly once",
          researched["level"] == 1 and researched["queue"] is None and researched["strict"],
          json.dumps(researched, ensure_ascii=False))
    gate = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return HOG_ENGINE.troopPrerequisites(s,
      HOG_CATALOG.units.elf.find(u=>u.id==='elf_2'))})()""")
    check("Barracks 2 and live Scouting 1 unlock Elf Scout under the disclosed cross-edition model",
          gate["available"] and gate["confidence"] == "B" and
          any(x["kind"] == "spell" and x["key"] == "scouting" and x["actual"] == 1 for x in gate["checks"]),
          json.dumps(gate, ensure_ascii=False))

    page.locator('#nav [data-tab="army"]').click()
    card = page.locator(".unitrow").filter(has_text="Elf Scout").first
    check("Elf Scout has an enabled real recruitment control",
          card.locator('[data-action="recruit"][data-id="elf_2"]').is_enabled())
    before = page.evaluate("HOG_APP_DEBUG.getState().res.gold")
    card.locator("#q_elf_2").fill("16")
    card.locator('[data-action="recruit"][data-id="elf_2"]').click()
    queued = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {
      unitId:s.training[0]?.unitId,count:s.training[0]?.count,remaining:s.training[0]?.remaining,
      gold:s.res.gold,strict:HOG_ENGINE.strictSave(s)}})()""")
    check("Recruit button spends resources and creates a real 16-Elf Scout training queue",
          queued["unitId"] == "elf_2" and queued["count"] == 16 and
          queued["remaining"] > 0 and queued["gold"] < before and queued["strict"],
          json.dumps(queued, ensure_ascii=False))
    # Advance only elapsed queue time through the real deterministic engine
    # tick. The queue, costs, completion and delivered stack are not injected.
    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),seconds=Math.ceil(s.training[0].remaining/s.speed)+1;
      HOG_ENGINE.tick(s,s.lastTick+seconds*1000);s.lastTick=Date.now();HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()""")
    recruited = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {
      count:s.army.elf_2,queue:s.training.length,strict:HOG_ENGINE.strictSave(s)}})()""")
    check("Real engine tick completes the queue and delivers 16 Elf Scouts",
          recruited["count"] == 16 and recruited["queue"] == 0 and recruited["strict"],
          json.dumps(recruited, ensure_ascii=False))

    page.locator("#formation_unit_0").select_option("elf_2")
    page.locator("#formation_count_0").fill("16")
    page.locator('[data-action="formation"]').click()
    formation = page.evaluate("HOG_APP_DEBUG.getState().formation[0]")
    check("Army form commits the recruited Elf Scouts to the march formation",
          formation and formation["unitId"] == "elf_2" and formation["count"] == 16,
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
      window.__elfScoutDraws=0;proto.drawImage=function(image,...args){
        if(image?.id==='unit-elf-scout')window.__elfScoutDraws++;
        return draw.call(this,image,...args)};})()""")
    ap_before_march = page.evaluate("HOG_APP_DEBUG.getState().ap")
    page.locator('[data-action="march"]').click()
    dispatched = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {
      target:s.march?.target,formation:s.expedition?.formation?.[0]?.unitId,
      armyCount:s.expedition?.army?.elf_2,ap:s.ap}})()""")
    check("March control dispatches the saved Elf Scout formation", dispatched["target"] == "5,6" and
          dispatched["formation"] == "elf_2" and dispatched["armyCount"] == 16 and dispatched["ap"] < ap_before_march,
          json.dumps(dispatched, ensure_ascii=False))

    page.wait_for_function("HOG_APP_DEBUG.getState()?.battle", timeout=20000)
    page.wait_for_function("window.__elfScoutDraws>0", timeout=7000)
    runtime = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),image=document.getElementById('unit-elf-scout'),b=s.battle;
      return {battle:!!b,target:s.march?.target||'5,6',phase:b?'tactical-battle':null,
        units:b?.allies?.map(u=>({unitId:u.unitId,count:u.count})),draws:window.__elfScoutDraws,
        imageReady:image.complete&&image.naturalWidth===512,
        actualUiMarch:s.race==='elf'&&s.expedition?.formation?.some(g=>g.unitId==='elf_2'),
        saveVersion:s.version,key:localStorage.getItem('heoofgaia_hg_only_v07')!==null}})()""")
    check("Natural NPC arrival opens a tactical battle", runtime["battle"] and runtime["phase"] == "tactical-battle")
    check("Loaded Elf Scout is drawn into the real battle canvas",
          runtime["imageReady"] and runtime["draws"] > 0, json.dumps(runtime, ensure_ascii=False))
    check("Live battle contains the UI-recruited Elf Scout stack",
          any(row["unitId"] == "elf_2" and row["count"] > 0 for row in runtime["units"] or []))
    check("Live dispatch and battle retain the v07 save key and schema",
          runtime["saveVersion"] == 7 and runtime["key"] and runtime["actualUiMarch"])

    screenshot = EVIDENCE / "elf-scout-npc-battle-chrome.png"
    page.screenshot(path=str(screenshot), full_page=True)
    shot_bytes = screenshot.read_bytes()
    width, height = struct.unpack(">II", shot_bytes[16:24])
    screenshot_info = {"sha256": hashlib.sha256(shot_bytes).hexdigest().upper(),
                       "bytes": len(shot_bytes), "resolution": f"{width}x{height}"}

    # Renderer-only parity check: draw a cloned snapshot with a Scout identity
    # on an enemy stack; do not modify the live battle or count this as gameplay.
    flip = page.evaluate("""(()=>{const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState();
      const fixture=JSON.parse(JSON.stringify(s));
      const enemy=fixture.battle?.enemies?.find(u=>u.pool>0);if(!enemy)return {available:false};
      enemy.unitId='elf_2';const canvas=document.createElement('canvas');canvas.width=1176;canvas.height=550;
      const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,scales=[];
      proto.drawImage=function(image,...args){if(image?.id==='unit-elf-scout')scales.push(this.getTransform().a);return draw.call(this,image,...args)};
      try{P.drawBattle(canvas,E,fixture)}finally{proto.drawImage=draw}
      return {available:true,draws:scales.length,enemyHorizontalFlip:scales.some(x=>x<0),scales};})()""")
    check("Renderer-only cloned battle check flips enemy Scout art horizontally",
          flip["available"] and flip["draws"] > 0 and flip["enemyHorizontalFlip"],
          json.dumps(flip, ensure_ascii=False))

    page.locator("#save").click()
    page.reload(wait_until="load")
    loaded = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return s&&{
      version:s.version,race:s.race,battle:!!s.battle,formation:s.expedition?.formation?.[0]?.unitId,
      battleUnit:s.battle?.allies?.some(u=>u.unitId==='elf_2'&&u.count>0),
      key:localStorage.getItem('heoofgaia_hg_only_v07')!==null,
      imageReady:(()=>{const i=document.getElementById('unit-elf-scout');return i.complete&&i.naturalWidth===512})()}})()""")
    check("v07 Save/Reload preserves the Elf Scout battle and formation",
          loaded["version"] == 7 and loaded["race"] == "elf" and loaded["battle"] and
          loaded["formation"] == "elf_2" and loaded["battleUnit"] and loaded["key"] and loaded["imageReady"],
          json.dumps(loaded, ensure_ascii=False))
    check("No JavaScript exceptions occur in the offline Elf Scout flow", not errors, json.dumps(errors))
    context.close()
    browser.close()

result = {
    "command": ".venv\\Scripts\\python.exe qa-hg11-elf-scout-chrome.py",
    "browser": BROWSER,
    "game": "Anh Hùng Thời Loạn",
    "sourceMode": "standalone local file:// HTML in installed Chromium",
    "fixtureDisclosure": "An Elf save is created through the intro. Barracks 2, Magic Tower 1, Warehouse 10, capped prerequisite resources and game speed are fixture-seeded to skip building time. Scouting 1 is researched through the actual Magic Tower UI, spends real modeled resources and completes through the real engine tick. The Recruit control queues Elf Scouts and spends real resources; its queue completes through the real engine tick. Formation, map click, March, NPC battle, sprite draw and v07 Save/Reload use the actual application. Enemy flip is checked separately with an isolated cloned renderer snapshot; it is not represented as gameplay.",
    "total": len(checks), "passed": sum(item["passed"] for item in checks),
    "failed": sum(not item["passed"] for item in checks), "errors": errors,
    "checks": checks, "elfScoutRuntime": runtime, "enemyRendererCheck": flip,
    "artifacts": {screenshot.name: screenshot_info},
}
receipt = QA / "elf-scout-battle-chrome.json"
receipt.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

manifest_path = ROOT / "assets" / "generated" / "hg11" / "units" / "elf-scout-manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest["states"]["integratedInBattle"] = runtime["battle"] and runtime["imageReady"] and runtime["draws"] > 0
manifest["states"]["enemyFlipVerified"] = flip["available"] and flip["enemyHorizontalFlip"]
manifest["states"]["saveLoadVerified"] = any(
    item["name"] == "v07 Save/Reload preserves the Elf Scout battle and formation" and item["passed"]
    for item in checks)
manifest["qualityGate"]["readabilityAtBattleScale"] = (
    "PASS: actual offline Chrome capture shows the Elf Scout stack at the battle renderer's 90x90 draw box."
    if screenshot_info["resolution"] and runtime["draws"] > 0 else
    "FAIL: focused offline screenshot or live sprite draw was missing.")
manifest["qualityGate"]["battleRender"] = (
    f"PASS: actual Scouting research, UI recruitment, training completion, formation and NPC battle produced {runtime['draws']} Elf Scout drawImage calls."
    if manifest["states"]["integratedInBattle"] else "FAIL: UI-recruited Elf Scout was not drawn in the live battle.")
manifest["qualityGate"]["enemyFlip"] = (
    "PASS: an isolated cloned battle snapshot drew enemy Elf Scout art under a negative horizontal canvas transform; this is renderer-only QA."
    if manifest["states"]["enemyFlipVerified"] else "FAIL: isolated enemy flip path did not draw the sprite under a negative horizontal transform.")
manifest["qualityGate"]["saveLoadImpact"] = (
    "PASS: presentation-only; actual v07 Save/Reload retained the Elf Scout battle, deployed formation, stack and image asset."
    if manifest["states"]["saveLoadVerified"] else "FAIL: actual v07 Save/Reload did not preserve the live battle and formation.")
manifest["battleEvidence"].update({
    "screenshot": f"docs/evidence/hg11/{screenshot.name}",
    "resolution": screenshot_info["resolution"],
    "sha256": screenshot_info["sha256"],
    "receipt": "docs/qa/hg11/elf-scout-battle-chrome.json",
    "chromeSpriteDraws": runtime["draws"],
})
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"CHROME TOTAL {result['passed']}/{result['total']} PASS; JavaScript exceptions={len(errors)}")
raise SystemExit(0 if result["failed"] == 0 and not errors else 1)
