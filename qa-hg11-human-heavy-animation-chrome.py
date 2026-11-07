"""Exercise the original five-action Human Vanguard atlas in a real offline battle."""
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
EVIDENCE = Path(os.environ.get("HOG_HG11_EVIDENCE_ROOT",ROOT / "docs" / "evidence" / "hg33" / "H2-human-vanguard"))
CONTACT_EVIDENCE = Path(os.environ.get("HOG_HG11_CONTACT_EVIDENCE_ROOT",ROOT / "docs" / "evidence" / "hg33" / "H3-troop-atlases"))
QA = Path(os.environ.get("HOG_HG11_REPORT_ROOT",ROOT / "docs" / "qa" / "hg33"))
EVIDENCE.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
browser_env = os.environ.get("HOG_CHROMIUM_PATH") or os.environ.get("HOG_CHROME_PATH")
candidates = [Path(browser_env)] if browser_env else [
    Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "Google" / "Chrome" / "Application" / "chrome.exe",
    Path(os.environ.get("PROGRAMFILES(X86)", "C:/Program Files (x86)")) / "Microsoft" / "Edge" / "Application" / "msedge.exe",
    Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "Microsoft" / "Edge" / "Application" / "msedge.exe",
]
BROWSER = next((str(path) for path in candidates if path and path.is_file()), None)

checks, errors = [], []


def check(name, passed, detail=""):
    checks.append({"name": name, "passed": bool(passed), "detail": detail})
    print(("PASS " if passed else "FAIL ") + name + (f" — {detail}" if detail else ""), flush=True)


def select_unit_on_battlefield(page, unit_id, label):
    pointer = page.evaluate("""unitId=>{
      const s=HOG_APP_DEBUG.getState(),b=s?.battle,c=document.querySelector('#battle-canvas'),
        r=c.getBoundingClientRect(),E=HOG_ENGINE,P=HOG_PAINTER,u=b?.allies.find(x=>x.id===unitId);
      if(!u)return {id:null,hit:null,clientX:0,clientY:0};
      const p=P.battleProjection(c,E).point(u.x+.5,u.y+.5),
        hit=P.battleHit(c,p.x,p.y,E,s)?.id||null;
      return {id:u.id,hit,clientX:r.left+p.x/c.width*r.width,clientY:r.top+p.y/c.height*r.height};
    }""",unit_id)
    check(f"{label} is hit-testable at its battlefield hex",pointer["id"]==unit_id and pointer["hit"]==unit_id,
          json.dumps(pointer,ensure_ascii=False))
    page.mouse.click(pointer["clientX"],pointer["clientY"])
    selected=page.evaluate("HOG_APP_DEBUG.getState().battle?.selected")
    check(f"Real battlefield click selects {label}",selected==unit_id,str(selected))
    return selected==unit_id


with sync_playwright() as playwright:
    launch = {"headless": True, "args": ["--no-sandbox", "--allow-file-access-from-files", "--disable-dev-shm-usage"]}
    if BROWSER:
        launch["executable_path"] = BROWSER
    browser = playwright.chromium.launch(**launch)
    context = browser.new_context(viewport={"width": 1440, "height": 1080}, device_scale_factor=1)
    page = context.new_page()
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.on("console", lambda msg: errors.append(f"console.{msg.type}: {msg.text}") if msg.type == "error" else None)
    page.goto(HTML.as_uri(), wait_until="load")
    check("Standalone HTML opens with the game title", page.title() == "Anh Hùng Thời Loạn", page.title())
    atlas_coverage = page.evaluate("""(async()=>{const A=HOG_HG33_TROOP_ATLASES,P=HOG_PAINTER,races=['human','elf','orc','undead'],catalog=HOG_CATALOG.units,ids=races.flatMap(r=>(catalog[r]||[]).map(u=>u.id)),actions=['idle','walk','attack','hit','death'],
      failures=[],expected=new Set(),actual=new Set(),imageIds=new Set(ids.map(id=>A.resolve(id)?.imageId).filter(Boolean)),testCtx=document.createElement('canvas').getContext('2d'),contacts={};
      const left=154,colW=140,rowH=148,top=38;
      for(const race of races){const canvas=document.createElement('canvas');canvas.width=left+5*colW;canvas.height=top+10*rowH;
        const c=canvas.getContext('2d');c.fillStyle='#14232a';c.fillRect(0,0,canvas.width,canvas.height);
        c.fillStyle='#e5c98f';c.font='bold 15px Georgia';c.textAlign='center';
        actions.forEach((a,i)=>c.fillText(a.toUpperCase(),left+i*colW+colW/2,24));
        contacts[race]={canvas,ctx:c,units:0};}
      function contact(race,tier,name,action,visual,unitId){const q=contacts[race],c=q.ctx,row=tier-1,col=actions.indexOf(action),cx=left+col*colW+colW/2,footY=top+row*rowH+138;
        if(col===0){c.fillStyle='#e7dec4';c.font='12px Georgia';c.textAlign='left';c.fillText(name,left-146,top+row*rowH+78);q.units++;}
        c.strokeStyle='#ffffff18';c.beginPath();c.moveTo(0,top+row*rowH+rowH-.5);c.lineTo(canvasWidth(race),top+row*rowH+rowH-.5);c.stroke();
        if(!P.battleUnitArt(c,cx,footY,false,visual,1,{unitId}))failures.push(unitId+'/'+action+': contact renderer declined');
      }
      function canvasWidth(race){return contacts[race].canvas.width}
      let framesRendered=0,atlasUnits=0;
      const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage;
      proto.drawImage=function(image,...args){if(imageIds.has(image?.id)&&args.length>=8)actual.add(image.id+':'+args[0]+':'+args[1]);return draw.call(this,image,...args)};
      try{
        for(const race of races){
          const all=(catalog[race]||[]).slice().sort((a,b)=>Number(a.id.split('_')[1])-Number(b.id.split('_')[1]));
          for(const unit of all){const unitId=unit.id,tier=Number(unitId.split('_')[1]);
            {
              const u=A.resolve(unitId),img=u&&document.getElementById(u.imageId),atlasSize=u?.atlasDimensions||[u?.atlasWidth,u?.atlasHeight];
              if(!u||!u.actions){failures.push(unitId+':missing five-action atlas');continue}
              if(!img||!img.dataset.hg33AtlasSrc){failures.push(unitId+':missing offline image');continue}
              if(!img.hasAttribute('src'))img.src=img.dataset.hg33AtlasSrc;
              await img.decode();
              if(img.naturalWidth!==atlasSize[0]||img.naturalHeight!==atlasSize[1]){failures.push(unitId+':bad decoded dimensions');continue}
              atlasUnits++;
              for(const action of actions){const clip=u.actions[action];
                for(let f=0;f<clip.count;f++){const time=Math.ceil(f*clip.durationMs/clip.count),visual={action,time,duration:clip.durationMs,alpha:1},
                  frame=P.troopAtlasFrame(unitId,action,time,clip.durationMs,unit.name),key=u.imageId+':'+frame.sx+':'+frame.sy;
                  expected.add(key);
                  if(frame.frame!==f||frame.row!==clip.row){failures.push(unitId+'/'+action+'/'+f+':wrong source cell');continue}
                  if(!P.battleUnitArt(testCtx,160,300,false,visual,1,{unitId,name:unit.name}))failures.push(unitId+'/'+action+'/'+f+':battle renderer declined atlas frame');
                  else framesRendered++;
                  if(f===4)contact(race,tier,unit.name,action,visual,unitId);
                }
              }
            }
          }
        }
      }catch(e){failures.push(String(e))}
      finally{proto.drawImage=draw}
      const sheets={};for(const race of races)sheets[race]=contacts[race].canvas.toDataURL('image/png');
      return {coreUnits:ids.length,atlasUnits,retainedUnits:Object.keys(A.retained),actionsPerAtlas:actions.length,
        frameCellsExpected:expected.size,frameCellsDrawn:framesRendered,sourceRectsObserved:actual.size,
        originalSkeletonAtlas:A.resolve('undead_1')?.imageId||null,
        originalSkeletonAttackFrames:A.resolve('undead_1')?.actions?.attack?.count||0,
        legacySkeletonModuleAbsent:!Object.prototype.hasOwnProperty.call(globalThis,'HOG_HG22_SKELETON'),
        contactUnits:Object.fromEntries(races.map(r=>[r,contacts[r].units])),contactSheets:sheets,
        failed:failures.length,failures:failures.slice(0,20)}})()""")
    check("All 40 effective troop atlases render every Idle/Walk/Attack/Hit/Death frame through the battle renderer",
          atlas_coverage["coreUnits"] == 40 and atlas_coverage["atlasUnits"] == 40 and len(atlas_coverage["retainedUnits"]) == 2 and
          atlas_coverage["actionsPerAtlas"] == 5 and atlas_coverage["frameCellsExpected"] == 1600 and
          atlas_coverage["frameCellsDrawn"] == 1600 and atlas_coverage["sourceRectsObserved"] == 1600 and
          atlas_coverage["originalSkeletonAtlas"] == "hg33-atlas-undead-skeleton" and atlas_coverage["originalSkeletonAttackFrames"] == 8 and
          atlas_coverage["legacySkeletonModuleAbsent"] and atlas_coverage["contactUnits"] == {"human":10,"elf":10,"orc":10,"undead":10} and
          atlas_coverage["failed"] == 0, json.dumps({k:v for k,v in atlas_coverage.items() if k!="contactSheets"}, ensure_ascii=False))
    CONTACT_EVIDENCE.mkdir(parents=True, exist_ok=True)
    contact_sheets = atlas_coverage.pop("contactSheets")
    contact_sheet_info = {}
    for race, data_url in contact_sheets.items():
        image_bytes = base64.b64decode(data_url.split(",", 1)[1])
        image_path = CONTACT_EVIDENCE / f"{race}-10-units-five-actions-chrome.png"
        image_path.write_bytes(image_bytes)
        width, height = struct.unpack(">II", image_bytes[16:24])
        contact_sheet_info[race] = {"path": str(image_path.relative_to(ROOT)).replace("\\", "/"),
                                    "sha256": hashlib.sha256(image_bytes).hexdigest().upper(),
                                    "bytes": len(image_bytes), "resolution": f"{width}x{height}"}
    check("Chromium renderer contact sheets cover all 40 units and five states",
          len(contact_sheet_info) == 4 and all(item["resolution"] == "854x1518" for item in contact_sheet_info.values()),
          json.dumps(contact_sheet_info, ensure_ascii=False))

    release_html = HTML.read_text(encoding="utf-8")
    check("Release has no KayKit combat frames or relative licensed-art paths",
          "assets/licensed/kaykit-heavy-soldier/rendered/" not in release_html)
    page.locator('[data-action="race"][data-race="human"]').click()
    page.locator('[data-action="start"]').click()
    check("Actual Human game start creates a version-7 save", page.evaluate("HOG_APP_DEBUG.getState().version") == 7)

    setup = page.evaluate("""(()=>{
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,C=HOG_CATALOG;
      // Skip construction/research time only. Recruitment, formation, March,
      // travel, combat actions, casualties and Save/Reload use real game paths.
      s.buildings.hall=4;s.buildings.barracks=4;s.buildings.blacksmith=1;
      s.buildings.warehouse=10;s.spells.manufacturing=1;s.spells.bootcamp=1;s.speed=1;
      for(const k of C.keys)s.res[k]=E.limits(s)[k];
      s.lastTick=Date.now();HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
      const u=C.units.human.find(x=>x.id==='human_4'),image=document.getElementById('unit-human-vanguard-atlas');
      return {version:s.version,requirements:E.troopPrerequisites(s,u),imageReady:image.complete&&image.naturalWidth===1536&&image.naturalHeight===1024,
        resources:{...s.res},buildingLevels:{hall:s.buildings.hall,barracks:s.buildings.barracks,blacksmith:s.buildings.blacksmith},manufacturing:s.spells.manufacturing};
    })()""")
    check("Seeded Heavy Soldier gates are met and original 1536×1024 8×5 atlas is loaded",
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
      HOG_ENGINE.tick(s,s.lastTick+seconds*1000);s.speed=60;s.lastTick=Date.now();HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()""")
    recruited = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {count:s.army.human_4,queue:s.training.length,
      strict:HOG_ENGINE.strictSave(s),unitCount:s.army.human_1}})()""")
    check("Real engine tick completes the queue and delivers both recruited troops",
          recruited["count"] == 2 and recruited["queue"] == 0 and recruited["strict"],
          json.dumps(recruited, ensure_ascii=False))

    page.locator("#formation_unit_0").select_option("human_4")
    page.locator("#formation_count_0").fill("1")
    page.locator("#formation_unit_1").select_option("human_1")
    page.locator("#formation_count_1").fill("15")
    page.locator('[data-action="formation"]').click()
    formation = page.evaluate("HOG_APP_DEBUG.getState().formation")
    check("Real formation control puts the Heavy Soldier in the front group beside the militia",
          len(formation) == 2 and formation[0]["unitId"] == "human_4" and formation[0]["count"] == 1 and
          formation[1]["unitId"] == "human_1" and formation[1]["count"] == 15,
          json.dumps(formation, ensure_ascii=False))

    page.locator('#nav [data-tab="map"]').click()
    page.locator("#world-canvas").wait_for(state="visible", timeout=5_000)
    page.wait_for_function("(()=>{const r=document.querySelector('#world-canvas')?.getBoundingClientRect();return !!r&&r.width>0&&r.height>0})()", timeout=5_000)
    point = page.evaluate("""(()=>{const c=document.querySelector('#world-canvas'),t=HOG_ENGINE.getTile('5,6'),m=HOG_PAINTER.mapCamera();
      const q=Math.max(.65,Math.min(2.05,m.zoom))*48;
      const x=(t.x+.5)*q+c.width/2-m.centerX*q,y=(t.y+.5)*q+c.height/2-m.centerY*q,hit=HOG_PAINTER.mapHit(c,x,y,HOG_ENGINE);
      return {x,y,target:{key:t.key,kind:t.kind,name:t.value},hit:{key:hit?.key,kind:hit?.kind,name:hit?.value},canvas:[c.width,c.height]}})()""")
    box = page.locator("#world-canvas").bounding_box()
    if box is None:
        raise RuntimeError("Visible world canvas had no browser bounding rectangle.")
    page.mouse.click(box["x"] + point["x"] * box["width"] / point["canvas"][0],
                     box["y"] + point["y"] * box["height"] / point["canvas"][1])
    selected = page.locator(".target-information h2").inner_text()
    check("Actual map click selects the dated nearby NPC", point["target"]["kind"] == "npc" and point["hit"]["key"] == point["target"]["key"] and "Wolves" in selected,
          json.dumps({"point":point,"selection":selected,"canvasRect":box},ensure_ascii=False))

    page.evaluate("""(()=>{const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,actions=['idle','walk','attack','hit','death'];
      window.__heavyAnimationSamples=[];window.__heavyDeathFrameData=null;window.__heavyDeathCapturePending=false;window.__battlefieldDraws=0;proto.drawImage=function(image,...args){
        if(image?.id==='battlefield-human-meadow')window.__battlefieldDraws++;
        if(image?.id==='unit-human-vanguard-atlas'&&args.length>=8){const tr=this.getTransform(),row=Math.floor(args[1]/204);
          window.__heavyAnimationSamples.push({id:actions[row],row,frame:Math.floor(args[0]/192),sx:args[0],sy:args[1],flip:tr.a<0,x:tr.e,y:tr.f,at:performance.now()})}
        if(image?.id==='unit-human-vanguard-atlas'&&Math.floor(args[1]/204)===4&&!window.__heavyDeathFrameData&&!window.__heavyDeathCapturePending){const canvas=this.canvas;window.__heavyDeathCapturePending=true;
          requestAnimationFrame(()=>{try{window.__heavyDeathFrameData=canvas.toDataURL('image/png')}catch(e){window.__heavyDeathCaptureError=String(e)}finally{window.__heavyDeathCapturePending=false}})}
        return draw.call(this,image,...args)};})()""")
    ap_before = page.evaluate("HOG_APP_DEBUG.getState().ap")
    # Use the current HG39 dispatch planner; the old direct-March control no
    # longer exists. Build/confirm the Heavy Soldier through its real UI so
    # this gate still exercises troop reservations, point limits and AP debit.
    page.locator('.hg39-map-target [data-action="dispatch-open"]').click()
    page.locator('.hg39-dispatch').wait_for(state="visible", timeout=5_000)
    page.locator('[data-action="dispatch-auto"]').click()
    heavy_row = page.locator('[data-dispatch-count="human_4"]')
    if not heavy_row.count():
        page.locator('#hg39-dispatch-unit').select_option('human_4')
        page.locator('[data-action="dispatch-add-unit"]').click()
        heavy_row = page.locator('[data-dispatch-count="human_4"]')
    # Recruitment above intentionally queued two Heavy Soldiers, while the
    # battle receipt gate verifies a single front-line stack. Reduce it with
    # the planner's real decrement control, preserving the normal UI path.
    for _ in range(3):
        if not heavy_row.count() or int(heavy_row.input_value() or "0") <= 1:
            break
        page.locator('[data-action="dispatch-adjust"][data-id="human_4"][data-delta="-1"]').click()
        page.wait_for_function("document.querySelector('[data-dispatch-count=\"human_4\"]')?.value === '1'", timeout=3_000)
    check("The real dispatch planner includes the UI-recruited Heavy Soldier",
          heavy_row.count() == 1 and heavy_row.input_value() == "1",
          json.dumps({"heavyRows":heavy_row.count(),"heavyCount":heavy_row.input_value() if heavy_row.count() else None},ensure_ascii=False))
    page.locator('[data-action="dispatch-confirm"]').wait_for(state="visible", timeout=5_000)
    if page.locator('[data-action="dispatch-confirm"]').is_disabled():
        raise AssertionError("The actual dispatch planner did not enable confirmation for the formed Heavy Soldier stack.")
    page.locator('[data-action="dispatch-confirm"]').click()
    dispatched = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {target:s.march?.target,
      formation:s.expedition?.formation?.map(x=>x.unitId),heavy:s.expedition?.army?.human_4,ap:s.ap}})()""")
    check("Actual March dispatch spends AP and carries the formed Heavy Soldier stack",
          dispatched["target"] == "5,6" and dispatched["heavy"] == 1 and dispatched["ap"] < ap_before,
          json.dumps(dispatched, ensure_ascii=False))
    page.wait_for_function("HOG_APP_DEBUG.getState()?.battle", timeout=30_000)
    page.wait_for_function("document.getElementById('unit-human-vanguard-atlas')?.complete&&window.__heavyAnimationSamples.length>0", timeout=8_000)
    initial = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;return {battle:!!b,turn:b?.turn,
      allies:b?.allies?.map(u=>({id:u.id,unitId:u.unitId,count:u.count,x:u.x,y:u.y,pool:u.pool})),
      atlas:(()=>{const i=document.getElementById('unit-human-vanguard-atlas');return [i?.complete,i?.naturalWidth,i?.naturalHeight]})(),
      battlefield:(()=>{const i=document.getElementById('battlefield-human-meadow');return {loaded:i?.complete,width:i?.naturalWidth,height:i?.naturalHeight,draws:window.__battlefieldDraws||0}})(),
      saveVersion:s.version,saveKey:localStorage.getItem('heoofgaia_hg_only_v07')!==null}})()""")
    check("Natural travel arrival opens a live battle with the UI-recruited Heavy Soldier", initial["battle"] and
          sum(u["unitId"] == "human_4" for u in initial["allies"]) == 1, json.dumps(initial, ensure_ascii=False))
    heavy_id = next(u["id"] for u in initial["allies"] if u["unitId"] == "human_4")
    check("Original action atlas and 1176×550 battlefield load and draw offline", initial["atlas"] == [True,1536,1024] and initial["battlefield"]["loaded"] and initial["battlefield"]["width"] == 1176 and initial["battlefield"]["height"] == 550 and initial["battlefield"]["draws"] > 0, json.dumps(initial, ensure_ascii=False))

    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;
      // Defender-only durability/position adjustment keeps the actual engine
      // actions observable. No player position, damage, death or result is set.
      b.enemies.forEach((u,i)=>{u.hp=1_000_000;u.pool=1_000_000;u.def=0;u.atk=0;u.range=20;
        u.x=i===0?7:10;u.y=i===0?2:(i===1?7:0)});
      b.autoUntil=Date.now()+600_000;s.battleAuto=false;HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()""")
    action_turns = []
    for _ in range(6):
        page.locator('[data-action="battle"][data-cmd="attack"]').click()
        page.wait_for_timeout(920)
        action_turns.append(page.evaluate("""(()=>{const b=HOG_APP_DEBUG.getState()?.battle;return b&&{
          turn:b.turn,events:(b.lastEvents||[]).map(e=>({actorId:e.actorId,targetId:e.targetId,damage:e.damage,death:e.death,path:e.path})),
          heavy:b.allies.filter(u=>u.unitId==='human_4').map(u=>({id:u.id,x:u.x,y:u.y,pool:u.pool}))}})()"""))
    samples = page.evaluate("window.__heavyAnimationSamples")
    action_ids = {x["id"] for x in samples}
    distinct_frames = {a: len({x["frame"] for x in samples if x["id"] == a}) for a in action_ids}
    observed_path = any(e["path"] for turn in action_turns if turn for e in turn["events"] if e["actorId"] == heavy_id)
    observed_damage = any(e["damage"] > 0 for turn in action_turns if turn for e in turn["events"] if e["actorId"] == heavy_id)
    check("Real Attack controls drive both a recorded Heavy Soldier route and actual damage",
          observed_path and observed_damage, json.dumps({"turns": action_turns, "sampledActions": sorted(action_ids)}, ensure_ascii=False))
    check("Live battle canvas samples distinct original idle, walk and attack frames",
          {"idle", "walk", "attack"}.issubset(action_ids) and all(distinct_frames.get(a, 0) >= 2 for a in ("idle", "walk", "attack")),
          json.dumps({"samples": len(samples), "actions": sorted(action_ids), "distinctFrames": distinct_frames}))
    page.set_viewport_size({"width": 1280, "height": 720})
    page.wait_for_timeout(180)
    live_screenshot = EVIDENCE / "human-heavy-soldier-battle-live-chrome.png"
    page.screenshot(path=str(live_screenshot), full_page=False)
    live_bytes = live_screenshot.read_bytes()
    live_width, live_height = struct.unpack(">II", live_bytes[16:24])
    live_screenshot_info = {"sha256": hashlib.sha256(live_bytes).hexdigest().upper(),
                            "bytes": len(live_bytes), "resolution": f"{live_width}x{live_height}"}
    page.set_viewport_size({"width": 960, "height": 540})
    page.wait_for_timeout(180)
    compact_screenshot = EVIDENCE / "human-vanguard-battle-live-960x540.png"
    page.screenshot(path=str(compact_screenshot), full_page=False)
    compact_bytes = compact_screenshot.read_bytes()
    compact_width, compact_height = struct.unpack(">II", compact_bytes[16:24])
    compact_screenshot_info = {"sha256": hashlib.sha256(compact_bytes).hexdigest().upper(),
                               "bytes": len(compact_bytes), "resolution": f"{compact_width}x{compact_height}"}
    check("Real battle screenshots are exact 1280×720 and 960×540 Chromium viewports",
          live_screenshot_info["resolution"] == "1280x720" and compact_screenshot_info["resolution"] == "960x540",
          json.dumps({"1280x720": live_screenshot_info, "960x540": compact_screenshot_info}, ensure_ascii=False))
    page.set_viewport_size({"width": 1440, "height": 1080})
    page.wait_for_timeout(120)

    page.evaluate("""(heavyId)=>{const s=HOG_APP_DEBUG.getState(),b=s.battle,heavy=b.allies.find(u=>u.id===heavyId),e=b.enemies[0];
      e.x=Math.min(heavy.x+1,10);e.y=heavy.y;e.atk=20;e.range=1;b.autoUntil=Date.now()+600_000;s.battleAuto=false;HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()}""",heavy_id)
    select_unit_on_battlefield(page,heavy_id,"Heavy Soldier before Hit animation")
    page.locator('[data-action="battle"][data-cmd="defend"]').click()
    # Wait for the renderer's receipt timeline to reach the real impact window
    # instead of sampling a fixed delay that can precede a staggered enemy.
    page.wait_for_function("""()=>{const s=HOG_APP_DEBUG.getState(),b=s?.battle,h=b?.allies.find(u=>u.unitId==='human_4'),now=performance.now(),timeline=HOG_PAINTER.battleTimelineFor(b,now);
      return !!h&&timeline?.items?.some(item=>item.event.targetId===h.id&&item.event.damage>0&&now>=item.impactAt&&now<item.effectEnd)}""", timeout=5_000)
    hit = page.evaluate("""(heavyId)=>{const s=HOG_APP_DEBUG.getState(),b=s?.battle,heavy=b?.allies.find(u=>u.id===heavyId),
      event=b?.lastEvents?.find(e=>e.targetId===heavyId&&e.damage>0),hitIndex=b?.lastEvents?.findIndex(e=>e.targetId===heavyId&&e.damage>0)??-1,now=performance.now(),visual=b&&heavy?HOG_PAINTER.battleVisualState(b,heavy,now,now):null,
      ctx=document.createElement('canvas').getContext('2d'),proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage;let rendered=false,source=null;
      proto.drawImage=function(image,...args){if(image?.id==='unit-human-vanguard-atlas'&&args.length>=8)source={sx:args[0],sy:args[1]};return draw.call(this,image,...args)};
      try{rendered=!!visual&&HOG_PAINTER.battleUnitArt(ctx,80,180,false,visual,1,heavy)}finally{proto.drawImage=draw}
      return {live:!!b,pool:heavy?.pool,event,visual:visual&&{action:visual.action,time:visual.time,duration:visual.duration},rendered,source}}""",heavy_id)
    check("Real damage receipt selects and renders the Human Vanguard Hit atlas row",
          hit["live"] and hit["event"] and hit["event"]["damage"] > 0 and hit["pool"] > 0 and
          hit["visual"] and hit["visual"]["action"] == "hit" and hit["rendered"] and
          hit["source"] and hit["source"]["sy"] == 3 * 204, json.dumps(hit, ensure_ascii=False))
    hit_frames = {"hit"} if hit["visual"] and hit["visual"]["action"] == "hit" and hit["rendered"] else set()

    page.evaluate("HOG_APP_DEBUG.save()")
    page.reload(wait_until="load")
    loaded = page.evaluate("""(heavyId)=>{const s=HOG_APP_DEBUG.getState(),b=s?.battle,heavy=b?.allies.find(u=>u.id===heavyId);return {version:s?.version,race:s?.race,battle:!!b,
      key:localStorage.getItem('heoofgaia_hg_only_v07')!==null,unit:heavy?.unitId,pool:heavy?.pool,
      enemyEvent:b?.lastEvents?.find(e=>e.targetId===heavyId),strict:HOG_ENGINE.strictSave(s),
      atlasReady:(()=>{const i=document.getElementById('unit-human-vanguard-atlas');return i.complete&&i.naturalWidth===1536&&i.naturalHeight===1024})()}}""",heavy_id)
    check("v07 Save/Reload preserves the active battle, damage event and offline atlas",
          loaded["version"] == 7 and loaded["race"] == "human" and loaded["battle"] and loaded["unit"] == "human_4" and
          loaded["pool"] > 0 and loaded["enemyEvent"] == hit["event"] and loaded["key"] and loaded["strict"] and loaded["atlasReady"],
          json.dumps(loaded, ensure_ascii=False))

    page.evaluate("""(()=>{const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,actions=['idle','walk','attack','hit','death'];
      window.__heavyAnimationSamples=[];window.__heavyDeathFrameData=null;window.__heavyDeathCapturePending=false;window.__battlefieldDraws=0;proto.drawImage=function(image,...args){
        if(image?.id==='battlefield-human-meadow')window.__battlefieldDraws++;
        if(image?.id==='unit-human-vanguard-atlas'&&args.length>=8){const tr=this.getTransform(),row=Math.floor(args[1]/204);
          window.__heavyAnimationSamples.push({id:actions[row],row,frame:Math.floor(args[0]/192),sx:args[0],sy:args[1],flip:tr.a<0,x:tr.e,y:tr.f,at:performance.now()})}
        if(image?.id==='unit-human-vanguard-atlas'&&Math.floor(args[1]/204)===4&&!window.__heavyDeathFrameData&&!window.__heavyDeathCapturePending){const canvas=this.canvas;window.__heavyDeathCapturePending=true;
          requestAnimationFrame(()=>{try{window.__heavyDeathFrameData=canvas.toDataURL('image/png')}catch(e){window.__heavyDeathCaptureError=String(e)}finally{window.__heavyDeathCapturePending=false}})}
        return draw.call(this,image,...args)};})()""")

    page.evaluate("""(heavyId)=>{const s=HOG_APP_DEBUG.getState(),b=s.battle,e=b.enemies[0];
      const heavy=b.allies.find(u=>u.id===heavyId);e.atk=100_000;e.range=1;e.x=heavy.x;e.y=heavy.y;
      b.autoUntil=Date.now()+600_000;s.battleAuto=false;HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()}""",heavy_id)
    select_unit_on_battlefield(page,heavy_id,"Heavy Soldier before Death animation")
    page.locator('[data-action="battle"][data-cmd="defend"]').click()
    page.wait_for_timeout(260)
    death = page.evaluate("""(heavyId)=>{const s=HOG_APP_DEBUG.getState(),b=s.battle,event=b?.lastEvents?.find(e=>e.actorId===b.enemies[0].id);
      return {live:!!b,p1:b?.allies.find(u=>u.id===heavyId)?.pool,survivingMilitia:b?.allies.filter(u=>u.unitId==='human_1'&&u.pool>0).reduce((n,u)=>n+u.pool,0),
        event,strict:HOG_ENGINE.strictSave(s),version:s.version}}""",heavy_id)
    page.wait_for_function("window.__heavyDeathFrameData!==null", timeout=3_000)
    page.wait_for_timeout(1100)
    death_data = page.evaluate("window.__heavyDeathFrameData")
    screenshot = EVIDENCE / "human-heavy-soldier-death-frame-chrome.png"
    shot_bytes = base64.b64decode(death_data.split(",", 1)[1])
    screenshot.write_bytes(shot_bytes)
    width, height = struct.unpack(">II", shot_bytes[16:24])
    screenshot_info = {"sha256": hashlib.sha256(shot_bytes).hexdigest().upper(),
                       "bytes": len(shot_bytes), "resolution": f"{width}x{height}"}
    samples = page.evaluate("window.__heavyAnimationSamples")
    death_frames = {x["frame"] for x in samples if x["id"] == "death"}
    check("Actual defender attack kills the Heavy Soldier while militia keeps battle active",
          death["live"] and death["p1"] == 0 and death["survivingMilitia"] > 0 and death["event"] and
          death["event"]["targetId"] == heavy_id and death["event"]["death"], json.dumps(death, ensure_ascii=False))
    check("Dead-stack playback samples all eight Death_A atlas frames while battle remains active", len(death_frames) == 8,
          json.dumps({"distinctFrames": len(death_frames), "totalSamples": len(samples)}))

    check("No JavaScript or browser console errors occur during live animation play", not errors, json.dumps(errors))
    context.close()
    browser.close()

result = {
    "command": ".venv\\Scripts\\python.exe qa-hg11-human-heavy-animation-chrome.py",
    "browser": BROWSER,
    "game": "Anh Hùng Thời Loạn",
    "sourceMode": "installed Chromium browser on the standalone local file:// HTML",
    "assetSource": "Original built-in image_gen atlas for Human Vanguard; assets/original/hg33/troops/human-vanguard-atlas.png; five action rows with eight frames each; no external image source.",
    "fixtureDisclosure": "A new Human game is created normally. The fixture seeds Hall 4, Barracks 4, Blacksmith 1, Manufacturing 1, Bootcamp 1 and prerequisite resources to skip prerequisite wait time. The UI recruits two Heavy Soldiers and spends real resources; the actual engine tick completes the queue. Real formation deploys one Heavy Soldier and militia; map selection, March, travel, Attack and Stand By controls resolve every player movement, damage and casualty. Enemy-only durability, position and attack values are adjusted to keep battle observable and cause a real engine casualty; no player positions, damage, death or battle result are set. The second Heavy Soldier stays at the home city. Enemy sprite mirroring is tested only on an isolated clone after reload.",
    "total": len(checks), "passed": sum(item["passed"] for item in checks),
    "failed": sum(not item["passed"] for item in checks), "errors": errors,
    "checks": checks, "observedTurns": action_turns, "initialBattle": initial, "deathReceipt": death,
    "troopAtlasCoverage": atlas_coverage, "troopContactSheets": contact_sheet_info,
    "observedAnimation": {"actions": sorted(action_ids), "distinctFramesByAction": distinct_frames,
                          "hitFrames": len(hit_frames), "deathFrames": len(death_frames),
                          "totalLiveCanvasSamples": len(samples)},
    "artifacts": {live_screenshot.name: live_screenshot_info,
       compact_screenshot.name: compact_screenshot_info, screenshot.name: screenshot_info},
}
receipt = QA / "human-heavy-animation-chrome.json"
receipt.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"CHROME TOTAL {result['passed']}/{result['total']} PASS; browser errors={len(errors)}", flush=True)
raise SystemExit(0 if result["failed"] == 0 and not errors else 1)
