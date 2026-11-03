"""Exercise the licensed, rig-rendered Human Heavy Soldier in the offline game."""
from pathlib import Path
import base64
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
    print(("PASS " if passed else "FAIL ") + name + (f" — {detail}" if detail else ""), flush=True)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=BROWSER,
        headless=True,
        args=["--no-sandbox", "--allow-file-access-from-files", "--disable-dev-shm-usage"],
    )
    context = browser.new_context(viewport={"width": 1440, "height": 1080}, device_scale_factor=1)
    page = context.new_page()
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.on("console", lambda msg: errors.append(f"console.{msg.type}: {msg.text}") if msg.type == "error" else None)
    page.goto(HTML.as_uri(), wait_until="load")
    check("Standalone HTML opens with the game title", page.title() == "Anh Hùng Thời Loạn", page.title())
    page.locator('[data-action="race"][data-race="human"]').click()
    page.locator('[data-action="start"]').click()
    check("Actual Human game start creates a version-7 save", page.evaluate("HOG_APP_DEBUG.getState().version") == 7)

    setup = page.evaluate("""(()=>{
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,C=HOG_CATALOG;
      // Skip construction/research time only. Recruitment, formation, March,
      // travel, combat actions, casualties and Save/Reload use real game paths.
      s.buildings.hall=4;s.buildings.barracks=4;s.buildings.blacksmith=1;
      s.buildings.warehouse=10;s.spells.manufacturing=1;s.spells.bootcamp=1;s.speed=60;
      for(const k of C.keys)s.res[k]=E.limits(s)[k];
      s.lastTick=Date.now();HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
      const u=C.units.human.find(x=>x.id==='human_4'),image=document.getElementById('unit-human-heavy-idle');
      return {version:s.version,requirements:E.troopPrerequisites(s,u),imageReady:image.complete&&image.naturalWidth===2048&&image.naturalHeight===512,
        resources:{...s.res},buildingLevels:{hall:s.buildings.hall,barracks:s.buildings.barracks,blacksmith:s.buildings.blacksmith},manufacturing:s.spells.manufacturing};
    })()""")
    check("Seeded Heavy Soldier gates are met and 2048×512 idle atlas is loaded",
          setup["requirements"]["available"] and setup["imageReady"], json.dumps(setup, ensure_ascii=False))

    page.locator('#nav [data-tab="army"]').click()
    card = page.locator(".unitrow").filter(has_text="Heavy Soldier").first
    check("Heavy Soldier recruitment control is enabled by its real prerequisite matrix",
          card.locator('[data-action="recruit"][data-id="human_4"]').is_enabled())
    gold_before = page.evaluate("HOG_APP_DEBUG.getState().res.gold")
    card.locator("#q_human_4").fill("2")
    card.locator('[data-action="recruit"][data-id="human_4"]').click()
    queued = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {unitId:s.training[0]?.unitId,count:s.training[0]?.count,
      remaining:s.training[0]?.remaining,gold:s.res.gold,strict:HOG_ENGINE.strictSave(s)}})()""")
    check("Actual recruitment spends resources and queues two Heavy Soldiers",
          queued["unitId"] == "human_4" and queued["count"] == 2 and queued["remaining"] > 0 and
          queued["gold"] < gold_before and queued["strict"], json.dumps(queued, ensure_ascii=False))
    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),seconds=Math.ceil(s.training[0].remaining/s.speed)+1;
      HOG_ENGINE.tick(s,s.lastTick+seconds*1000);s.lastTick=Date.now();HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()""")
    recruited = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {count:s.army.human_4,queue:s.training.length,
      strict:HOG_ENGINE.strictSave(s),unitCount:s.army.human_1}})()""")
    check("Real engine tick completes the queue and delivers both recruited troops",
          recruited["count"] == 2 and recruited["queue"] == 0 and recruited["strict"],
          json.dumps(recruited, ensure_ascii=False))

    page.locator("#formation_count_0").fill("15")
    page.locator("#formation_unit_1").select_option("human_4")
    page.locator("#formation_count_1").fill("1")
    page.locator("#formation_unit_2").select_option("human_1")
    page.locator("#formation_count_2").fill("1")
    page.locator('[data-action="formation"]').click()
    formation = page.evaluate("HOG_APP_DEBUG.getState().formation")
    check("Real formation control places one Heavy Soldier beside two militia groups",
          len(formation) == 3 and formation[0]["unitId"] == "human_1" and formation[1]["unitId"] == "human_4" and
          formation[1]["count"] == 1 and formation[2]["unitId"] == "human_1",
          json.dumps(formation, ensure_ascii=False))

    page.locator('#nav [data-tab="map"]').click()
    page.locator("#world-canvas").wait_for(state="visible", timeout=5_000)
    page.wait_for_function("(()=>{const r=document.querySelector('#world-canvas')?.getBoundingClientRect();return !!r&&r.width>0&&r.height>0})()", timeout=5_000)
    point = page.evaluate("""(()=>{const c=document.querySelector('#world-canvas'),t=HOG_ENGINE.getTile('5,6'),m=HOG_PAINTER.mapCamera();
      const q=Math.max(.65,Math.min(2.05,m.zoom))*48;
      return {x:(t.x+.5)*q+c.width/2-m.centerX*q,y:(t.y+.5)*q+c.height/2-m.centerY*q,target:{key:t.key,kind:t.kind,name:t.value}}})()""")
    box = page.locator("#world-canvas").bounding_box()
    if box is None:
        raise RuntimeError("Visible world canvas had no browser bounding rectangle.")
    page.mouse.click(box["x"] + point["x"] * box["width"] / 1176,
                     box["y"] + point["y"] * box["height"] / 620)
    selected = page.locator(".target-information h2").inner_text()
    check("Actual map click selects the dated nearby NPC", point["target"]["kind"] == "npc" and "Wolves" in selected, selected)

    page.evaluate("""(()=>{const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage;
      window.__heavyAnimationSamples=[];window.__heavyDeathFrameData=null;window.__heavyDeathCapturePending=false;proto.drawImage=function(image,...args){
        if(image?.id?.startsWith('unit-human-heavy-')&&args.length>=8){const tr=this.getTransform();
          window.__heavyAnimationSamples.push({id:image.id,sx:args[0],sy:args[1],flip:tr.a<0,x:tr.e,y:tr.f,at:performance.now()})}
        if(image?.id==='unit-human-heavy-death'&&!window.__heavyDeathFrameData&&!window.__heavyDeathCapturePending){const canvas=this.canvas;window.__heavyDeathCapturePending=true;
          requestAnimationFrame(()=>{try{window.__heavyDeathFrameData=canvas.toDataURL('image/png')}catch(e){window.__heavyDeathCaptureError=String(e)}finally{window.__heavyDeathCapturePending=false}})}
        return draw.call(this,image,...args)};})()""")
    ap_before = page.evaluate("HOG_APP_DEBUG.getState().ap")
    page.locator('[data-action="march"]').click()
    dispatched = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {target:s.march?.target,
      formation:s.expedition?.formation?.map(x=>x.unitId),heavy:s.expedition?.army?.human_4,ap:s.ap}})()""")
    check("Actual March dispatch spends AP and carries the formed Heavy Soldier stack",
          dispatched["target"] == "5,6" and dispatched["heavy"] == 1 and dispatched["ap"] < ap_before,
          json.dumps(dispatched, ensure_ascii=False))
    page.wait_for_function("HOG_APP_DEBUG.getState()?.battle", timeout=30_000)
    page.wait_for_function("document.getElementById('unit-human-heavy-idle')?.complete&&window.__heavyAnimationSamples.length>0", timeout=8_000)
    initial = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;return {battle:!!b,turn:b?.turn,
      allies:b?.allies?.map(u=>({id:u.id,unitId:u.unitId,count:u.count,x:u.x,y:u.y,pool:u.pool})),
      atlasIds:['idle','walk','attack','hit','death'].map(a=>{const i=document.getElementById('unit-human-heavy-'+a);return [i?.complete,i?.naturalWidth,i?.naturalHeight]}),
      saveVersion:s.version,saveKey:localStorage.getItem('heoofgaia_hg_only_v07')!==null}})()""")
    check("Natural travel arrival opens a live battle with the UI-recruited Heavy Soldier", initial["battle"] and
          sum(u["unitId"] == "human_4" for u in initial["allies"]) == 1, json.dumps(initial, ensure_ascii=False))
    check("All five actual action atlases load into the offline browser", all(x[0] is True and x[1] == 2048 and x[2] == (256 if i == 3 else 512) for i,x in enumerate(initial["atlasIds"])))

    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;
      // Defender-only durability/position adjustment keeps the actual engine
      // actions observable. No player position, damage, death or result is set.
      b.enemies.forEach((u,i)=>{u.hp=1_000_000;u.pool=1_000_000;u.def=0;u.atk=0;u.range=20;
        u.x=i===0?7:10;u.y=i===0?2:(i===1?7:0)});
      b.autoUntil=Date.now()+600_000;s.battleAuto=false;HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()""")
    action_turns = []
    for _ in range(6):
        page.locator('[data-action="battle"][data-cmd="attack"]').click()
        page.wait_for_timeout(520)
        action_turns.append(page.evaluate("""(()=>{const b=HOG_APP_DEBUG.getState()?.battle;return b&&{
          turn:b.turn,events:(b.lastEvents||[]).map(e=>({actorId:e.actorId,targetId:e.targetId,damage:e.damage,death:e.death,path:e.path})),
          heavy:b.allies.filter(u=>u.unitId==='human_4').map(u=>({id:u.id,x:u.x,y:u.y,pool:u.pool}))}})()"""))
    samples = page.evaluate("window.__heavyAnimationSamples")
    action_ids = {x["id"].removeprefix("unit-human-heavy-") for x in samples}
    distinct_frames = {a: len({(x["sx"], x["sy"]) for x in samples if x["id"] == "unit-human-heavy-" + a}) for a in action_ids}
    observed_path = any(e["path"] for turn in action_turns if turn for e in turn["events"] if e["actorId"] == "p1")
    observed_damage = any(e["damage"] > 0 for turn in action_turns if turn for e in turn["events"] if e["actorId"] == "p1")
    check("Real Attack controls drive both a recorded Heavy Soldier route and actual damage",
          observed_path and observed_damage, json.dumps({"turns": action_turns, "sampledActions": sorted(action_ids)}, ensure_ascii=False))
    check("Live 30 FPS battle canvas samples distinct idle, walk and attack atlas frames",
          {"idle", "walk", "attack"}.issubset(action_ids) and all(distinct_frames.get(a, 0) >= 2 for a in ("idle", "walk", "attack")),
          json.dumps({"samples": len(samples), "actions": sorted(action_ids), "distinctFrames": distinct_frames}))
    live_screenshot = EVIDENCE / "human-heavy-soldier-battle-live-chrome.png"
    page.screenshot(path=str(live_screenshot), full_page=True)
    live_bytes = live_screenshot.read_bytes()
    live_width, live_height = struct.unpack(">II", live_bytes[16:24])
    live_screenshot_info = {"sha256": hashlib.sha256(live_bytes).hexdigest().upper(),
                            "bytes": len(live_bytes), "resolution": f"{live_width}x{live_height}"}

    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle,p1=b.allies.find(u=>u.id==='p1'),e=b.enemies[0];
      e.x=Math.min(p1.x+1,10);e.y=p1.y;e.atk=20;e.range=1;b.autoUntil=Date.now()+600_000;s.battleAuto=false;HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()""")
    page.locator('[data-action="stack"][data-id="p1"]').click()
    page.locator('[data-action="battle"][data-cmd="defend"]').click()
    page.wait_for_timeout(260)
    hit = page.evaluate("""(()=>{const b=HOG_APP_DEBUG.getState()?.battle;return {live:!!b,p1:b?.allies.find(u=>u.id==='p1')?.pool,
      event:b?.lastEvents?.find(e=>e.actorId===b.enemies[0].id)}})()""")
    samples = page.evaluate("window.__heavyAnimationSamples")
    hit_frames = { (x["sx"], x["sy"]) for x in samples if x["id"] == "unit-human-heavy-hit" }
    check("Actual Stand By turn receives engine-recorded damage on Heavy Soldier p1",
          hit["live"] and hit["event"] and hit["event"]["targetId"] == "p1" and hit["event"]["damage"] > 0 and not hit["event"]["death"],
          json.dumps(hit, ensure_ascii=False))
    check("Received-damage playback samples multiple real Hit_A atlas frames", len(hit_frames) >= 2,
          json.dumps({"distinctFrames": len(hit_frames), "totalSamples": len(samples)}))

    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle,e=b.enemies[0];
      const p1=b.allies.find(u=>u.id==='p1');e.atk=100_000;e.range=1;e.x=p1.x;e.y=p1.y;
      b.autoUntil=Date.now()+600_000;s.battleAuto=false;HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()""")
    page.locator('[data-action="stack"][data-id="p1"]').click()
    page.locator('[data-action="battle"][data-cmd="defend"]').click()
    page.wait_for_timeout(260)
    death = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle,event=b?.lastEvents?.find(e=>e.actorId===b.enemies[0].id);
      return {live:!!b,p1:b?.allies.find(u=>u.id==='p1')?.pool,survivingMilitia:b?.allies.filter(u=>u.unitId==='human_1'&&u.pool>0).reduce((n,u)=>n+u.pool,0),
        event,strict:HOG_ENGINE.strictSave(s),version:s.version}})()""")
    page.wait_for_function("window.__heavyDeathFrameData!==null", timeout=3_000)
    death_data = page.evaluate("window.__heavyDeathFrameData")
    screenshot = EVIDENCE / "human-heavy-soldier-death-frame-chrome.png"
    shot_bytes = base64.b64decode(death_data.split(",", 1)[1])
    screenshot.write_bytes(shot_bytes)
    width, height = struct.unpack(">II", shot_bytes[16:24])
    screenshot_info = {"sha256": hashlib.sha256(shot_bytes).hexdigest().upper(),
                       "bytes": len(shot_bytes), "resolution": f"{width}x{height}"}
    samples = page.evaluate("window.__heavyAnimationSamples")
    death_frames = { (x["sx"], x["sy"]) for x in samples if x["id"] == "unit-human-heavy-death" }
    check("Actual defender attack kills Heavy Soldier p1 while militia keeps battle active",
          death["live"] and death["p1"] == 0 and death["survivingMilitia"] > 0 and death["event"] and
          death["event"]["targetId"] == "p1" and death["event"]["death"], json.dumps(death, ensure_ascii=False))
    check("Dead-stack playback samples the actual Death_A atlas while battle remains active", len(death_frames) >= 2,
          json.dumps({"distinctFrames": len(death_frames), "totalSamples": len(samples)}))

    page.locator("#save").click()
    page.reload(wait_until="load")
    loaded = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),b=s?.battle;return {version:s?.version,race:s?.race,battle:!!b,
      key:localStorage.getItem('heoofgaia_hg_only_v07')!==null,p1Unit:b?.allies.find(u=>u.id==='p1')?.unitId,
      p1:b?.allies.find(u=>u.id==='p1')?.pool,enemyEvent:b?.lastEvents?.find(e=>e.actorId===b.enemies[0].id),strict:HOG_ENGINE.strictSave(s),
      atlasReady:(()=>{const i=document.getElementById('unit-human-heavy-death');return i.complete&&i.naturalWidth===2048})()}})()""")
    check("v07 Save/Reload preserves the actual death result, prior battle receipts and atlases",
          loaded["version"] == 7 and loaded["race"] == "human" and loaded["battle"] and loaded["p1Unit"] == "human_4" and
          loaded["p1"] == 0 and loaded["enemyEvent"] == death["event"] and loaded["key"] and loaded["strict"] and loaded["atlasReady"],
          json.dumps(loaded, ensure_ascii=False))

    # Renderer-only parity check uses an isolated copy, not gameplay state.
    flip = page.evaluate("""(()=>{const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState(),copy=JSON.parse(JSON.stringify(s));
      const enemy=copy.battle?.enemies.find(u=>u.pool>0);if(!enemy)return {available:false};enemy.unitId='human_4';
      const canvas=document.createElement('canvas');canvas.width=1176;canvas.height=550;const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,scales=[];
      proto.drawImage=function(image,...args){if(image?.id?.startsWith('unit-human-heavy-'))scales.push(this.getTransform().a);return draw.call(this,image,...args)};
      try{P.drawBattle(canvas,E,copy,performance.now()+1000)}finally{proto.drawImage=draw}
      return {available:true,draws:scales.length,enemyHorizontalFlip:scales.some(x=>x<0),scales};})()""")
    check("Renderer-only cloned battle mirrors licensed sprite art for an enemy", flip["available"] and flip["enemyHorizontalFlip"],
          json.dumps(flip, ensure_ascii=False))
    check("No JavaScript or browser console errors occur during live animation play", not errors, json.dumps(errors))
    context.close()
    browser.close()

result = {
    "command": ".venv\\Scripts\\python.exe qa-hg11-human-heavy-animation-chrome.py",
    "browser": BROWSER,
    "game": "Anh Hùng Thời Loạn",
    "sourceMode": "installed Chrome on the standalone local file:// HTML",
    "assetSource": "Kay Lousberg KayKit Adventures 1.0 Knight rig; pinned upstream commit 672074b73ba276876a19e8816ecdc5241817ab47; CC0-1.0; rendered real GLB Idle, Walking_A, 1H_Melee_Attack_Chop, Hit_A and Death_A clips.",
    "fixtureDisclosure": "A new Human game is created normally. The fixture seeds Hall 4, Barracks 4, Blacksmith 1, Manufacturing 1, Bootcamp 1 and prerequisite resources to skip prerequisite wait time. The UI recruits two Heavy Soldiers and spends real resources; the actual engine tick completes the queue. Real formation deploys one Heavy Soldier and militia; map selection, March, travel, Attack and Stand By controls resolve every player movement, damage and casualty. Enemy-only durability, position and attack values are adjusted to keep battle observable and cause a real engine casualty; no player positions, damage, death or battle result are set. The second Heavy Soldier stays at the home city. Enemy sprite mirroring is tested only on an isolated clone after reload.",
    "total": len(checks), "passed": sum(item["passed"] for item in checks),
    "failed": sum(not item["passed"] for item in checks), "errors": errors,
    "checks": checks, "observedTurns": action_turns, "initialBattle": initial, "deathReceipt": death,
    "observedAnimation": {"actions": sorted(action_ids), "distinctFramesByAction": distinct_frames,
                          "hitFrames": len(hit_frames), "deathFrames": len(death_frames),
                          "totalLiveCanvasSamples": len(samples)},
    "enemyRendererCheck": flip, "artifacts": {live_screenshot.name: live_screenshot_info, screenshot.name: screenshot_info},
}
receipt = QA / "human-heavy-animation-chrome.json"
receipt.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"CHROME TOTAL {result['passed']}/{result['total']} PASS; browser errors={len(errors)}", flush=True)
raise SystemExit(0 if result["failed"] == 0 and not errors else 1)
