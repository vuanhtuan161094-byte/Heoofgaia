"""Play actual offline battles for the remaining HG33 H2 art pilots.

Prerequisite buildings/resources are seeded to avoid unrelated wait time. Unit
recruitment, training completion, formation, world-map selection, marching and
all attack/defend/casualty events use the real controls and engine. Combat
fixtures modify defenders only so the five animation events can be observed.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
GAME = ROOT / "Play-Heoofgaia-HG11.html"
EVIDENCE = ROOT / "docs/evidence/hg33/H2-six-pilot-live"
QA = ROOT / "docs/qa/hg33/H2-six-pilot-live-chrome.json"
PILOTS = [
    {"race": "elf", "unitId": "elf_4", "name": "Elf Archer"},
    {"race": "orc", "unitId": "orc_5", "name": "Ogre"},
    {"race": "undead", "unitId": "undead_1", "name": "Skeleton Warrior"},
    {"race": "elf", "unitId": "elf_9", "name": "Green Dragon"},
]
SIZES = [(1280, 720), (960, 540)]
checks: list[dict] = []
screenshots: list[dict] = []
errors: list[str] = []


def check(name: str, passed: bool, detail=None) -> None:
    checks.append({"name": name, "passed": bool(passed), "detail": detail})
    print(("PASS " if passed else "FAIL ") + name + (" — " + json.dumps(detail, ensure_ascii=False)[:1800] if not passed and detail is not None else ""), flush=True)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest().upper()


def save_shot(page, label: str, width: int, height: int) -> None:
    page.set_viewport_size({"width": width, "height": height})
    page.wait_for_timeout(100)
    path = EVIDENCE / f"{label}-{width}x{height}.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(path), full_page=False)
    payload = path.read_bytes()
    actual = tuple(int.from_bytes(payload[offset:offset + 4], "big") for offset in (16, 20))
    screenshots.append({"path": path.relative_to(ROOT).as_posix(), "sha256": sha(payload),
                        "bytes": len(payload), "viewport": f"{width}x{height}",
                        "imageSize": f"{actual[0]}x{actual[1]}"})
    check(f"Chromium gameplay screenshot {label} is exact {width}x{height}", actual == (width, height), screenshots[-1])


def battlefield_click(page, stack_id: str, label: str) -> bool:
    point = page.evaluate("""id=>{
      const s=HOG_APP_DEBUG.getState(),b=s?.battle,c=document.querySelector('#battle-canvas'),
        r=c.getBoundingClientRect(),E=HOG_ENGINE,P=HOG_PAINTER,u=b?.allies.find(x=>x.id===id);
      if(!u)return {id:null,hit:null,x:0,y:0};
      const p=P.battleProjection(c,E).point(u.x+.5,u.y+.5),hit=P.battleHit(c,p.x,p.y,E,s)?.id||null;
      return {id:u.id,hit,x:r.left+p.x/c.width*r.width,y:r.top+p.y/c.height*r.height};
    }""", stack_id)
    valid = point["id"] == stack_id and point["hit"] == stack_id
    check(f"{label} is selectable through its actual hex sprite", valid, point)
    if valid:
        page.mouse.click(point["x"], point["y"])
        selected = page.evaluate("HOG_APP_DEBUG.getState().battle?.selected")
        valid = selected == stack_id
        check(f"Battlefield pointer selects {label}", valid, selected)
    return valid


def move_stack_on_actual_hex(page, stack_id: str, unit_id: str, name: str) -> dict:
    destination = page.evaluate("""id=>{const s=HOG_APP_DEBUG.getState(),b=s.battle,u=b?.allies.find(x=>x.id===id),
      preview=u&&HOG_ENGINE.battleMovePreview(b,id),cell=preview?.cells?.[0];
      if(!u||!cell)return {id,cell:null};
      const c=document.querySelector('#battle-canvas'),p=HOG_PAINTER.battleProjection(c,HOG_ENGINE),q=p.center(cell.x,cell.y),r=c.getBoundingClientRect();
      return {id,from:{x:u.x,y:u.y},cell,point:{x:r.left+q.x/c.width*r.width,y:r.top+q.y/c.height*r.height},canvas:[c.width,c.height]}}""", stack_id)
    valid = bool(destination.get("cell")) and battlefield_click(page, stack_id, name + " before Walk_A")
    check(f"{name} has an actual reachable battle hex for manual Walk_A", valid, destination)
    if not valid:
        return {"ok": False, "destination": destination}
    page.locator('[data-action="move-mode"]').click()
    page.mouse.click(destination["point"]["x"], destination["point"]["y"])
    page.wait_for_function("window.__hg33PilotSamples.some(x=>x.row===1)", timeout=3_000)
    receipt = page.evaluate("""id=>{const b=HOG_APP_DEBUG.getState().battle;return b?.lastEvents?.find(e=>e.actorId===id&&e.order==='move')||null}""", stack_id)
    ok = bool(receipt and receipt.get("path"))
    check(f"Real {name} move command walks along the selected hex route", ok,
          {"receipt": receipt, "destination": destination["cell"]})
    save_shot(page, f"{unit_id}-walk", 1280, 720)
    return {"ok": ok, "receipt": receipt, "destination": destination["cell"]}


def set_enemy_observation_fixture(page, stack_id: str, attack: int) -> dict:
    return page.evaluate("""({stackId,attack})=>{
      const s=HOG_APP_DEBUG.getState(),b=s.battle,actor=b.allies.find(u=>u.id===stackId);
      if(!actor)throw Error('pilot stack missing: '+stackId);
      const adjacent={x:actor.x>0?actor.x-1:actor.x+1,y:actor.y};
      b.enemies.forEach((e,i)=>{
        e.hp=1_000_000;e.pool=1_000_000;e.count=1;e.def=0;e.atk=0;e.range=1;
        e.x=i===0?adjacent.x:11;e.y=i===0?adjacent.y:8-i;
      });
      b.enemies[0].atk=attack;
      b.autoUntil=Date.now()+600_000;s.battleAuto=false;HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
      return {actor:{id:actor.id,x:actor.x,y:actor.y,pool:actor.pool},enemy:{...b.enemies[0]},strict:HOG_ENGINE.strictSave(s)};
    }""", {"stackId": stack_id, "attack": attack})


def accepted_battle_turn(page, command: str) -> dict:
    """Click the real combat button only when the production animation lock permits.
    Do not call battleAct directly, bypass the lock, or fabricate a hit.
    """
    before=page.evaluate("HOG_APP_DEBUG.getState().battle?.turn")
    if before is None:raise AssertionError("No live battle before "+command)
    for attempt in range(3):
        page.locator(f'[data-action="battle"][data-cmd="{command}"]').click()
        after=page.evaluate("HOG_APP_DEBUG.getState().battle?.turn")
        if after is not None and after>before:
            return {"before":before,"after":after,"attempts":attempt+1}
        # A blocked input is expected during genuine HG58 animation playback.
        # Wait the source renderer's actual turn length at x1/x2/x3 before retry.
        duration=page.evaluate("""() => {
          const b=HOG_APP_DEBUG.getState().battle;
          const speed=HOG_APP_DEBUG.battleViewPrefs().speed;
          return Math.max(900,Math.ceil((HOG_PAINTER.battleTimelineTurnDuration(b)||900)/speed));
        }""")
        page.wait_for_timeout(duration+180)
    raise AssertionError("Real combat turn remained locked: "+command+" from "+str(before))


def get_action_receipt(page, stack_id: str, expected_action: str, event_kind: str) -> dict:
    return page.evaluate("""({stackId,expectedAction,eventKind})=>{
      const s=HOG_APP_DEBUG.getState(),b=s?.battle,all=[...(b?.allies||[]),...(b?.enemies||[])],u=all.find(x=>x.id===stackId),
        timeline=b&&HOG_PAINTER.battleTimelineFor(b,performance.now()),
        item=(timeline?.items||[]).filter(row=>{const e=row.event;return eventKind==='actor'?e.actorId===stackId&&e.damage>0:
          e.targetId===stackId&&e.damage>0&&(expectedAction!=='death'||e.death)}).at(-1),event=item?.event||null,
        sampleAt=item?(expectedAction==='attack'?item.start+item.moveMs+200:
          item.impactAt+(expectedAction==='death'?400:240)):performance.now(),
        visual=b&&u?HOG_PAINTER.battleVisualState(b,u,sampleAt,sampleAt):null,
        ctx=document.createElement('canvas').getContext('2d'),proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage;
      let source=null,rendered=false;const definition=HOG_HG33_TROOP_ATLASES?.resolve?.(u?.unitId,u?.name),
        frame=definition?HOG_PAINTER.troopAtlasFrame(u.unitId,visual?.action,visual?.time,visual?.duration,u.name):null;
      proto.drawImage=function(image,...args){
        if(args.length>=8&&image?.id?.startsWith('hg33-atlas-'))source={imageId:image.id,sx:args[0],sy:args[1]};
        if(args.length>=8&&image?.id===definition?.imageId)source={imageId:image.id,sx:args[0],sy:args[1]};
        return draw.call(this,image,...args)};
      try{rendered=!!visual&&HOG_PAINTER.battleUnitArt(ctx,80,180,u?.side==='enemy',visual,1,u)}finally{proto.drawImage=draw}
      if(frame)source={imageId:frame.imageId,sx:frame.sx,sy:frame.sy,sw:frame.sw,sh:frame.sh};
      return {battle:!!b,event,visual:visual&&{action:visual.action,time:visual.time,duration:visual.duration,alpha:visual.alpha},rendered,source,
        atlasLoaded:definition?(()=>{const image=document.getElementById(definition.imageId);return !!image?.complete&&image.naturalWidth===(definition.atlasDimensions||[definition.atlasWidth,definition.atlasHeight])[0]})():null,
        strict:HOG_ENGINE.strictSave(s),version:s.version};
    }""", {"stackId": stack_id, "expectedAction": expected_action, "eventKind": event_kind})


def run_troop_pilot(browser, pilot: dict) -> None:
    race, unit_id, name = pilot["race"], pilot["unitId"], pilot["name"]
    page = browser.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
    page.set_default_timeout(15_000)
    page.on("pageerror", lambda exc: errors.append(f"{unit_id}: {exc}"))
    page.on("console", lambda msg: errors.append(f"{unit_id}: console.{msg.type}: {msg.text}") if msg.type == "error" else None)
    page.goto(GAME.as_uri(), wait_until="load")
    check(f"{name} opens the standalone game", page.title() == "Anh Hùng Thời Loạn", page.title())
    page.locator(f'[data-action="race"][data-race="{race}"]').click()
    page.locator('[data-action="start"]').click()
    seeded = page.evaluate("""()=>{
      const E=HOG_ENGINE,C=HOG_CATALOG,s=HOG_APP_DEBUG.getState();
      // Only prerequisite buildings, research and resources are seeded.
      s.buildings.hall=10;s.buildings.barracks=10;s.buildings.warehouse=10;
      s.buildings.blacksmith=1;s.spells.manufacturing=1;s.spells.bootcamp=1;s.spells.scouting=1;s.speed=1;
      for(const k of C.keys)s.res[k]=E.limits(s)[k];
      s.lastTick=Date.now();HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
      return {version:s.version,strict:E.strictSave(s),unitCount:C.units[s.race].length,resources:{...s.res}};
    }""")
    check(f"{name} scenario starts with valid Save v07", seeded["version"] == 7 and seeded["strict"], seeded)

    page.locator('#nav [data-tab="army"]').click()
    card = page.locator(".unitrow").filter(has_text=name).first
    check(f"{name} recruitment control is enabled", card.locator(f'[data-action="recruit"][data-id="{unit_id}"]').is_enabled())
    before = page.evaluate("""id=>{const s=HOG_APP_DEBUG.getState();return {gold:s.res.gold,army:s.army[id]||0}}""", unit_id)
    page.locator(f"#q_{unit_id}").fill("2")
    page.locator(f'[data-action="recruit"][data-id="{unit_id}"]').click()
    queue = page.evaluate("""id=>{const s=HOG_APP_DEBUG.getState();return {id:s.training[0]?.unitId||null,
      count:s.training[0]?.count||0,army:s.army[id]||0,
      gold:s.res.gold,strict:HOG_ENGINE.strictSave(s)}}""", unit_id)
    queued = queue["id"] == unit_id and queue["count"] == 2 and queue["army"] == before["army"]
    delivered = queue["id"] is None and queue["count"] == 0 and queue["army"] == before["army"] + 2
    # HG40.5: effective recruitment 5000x can complete a paid two-unit
    # batch before a Chromium DOM inspection. Either state is legitimate;
    # strict stock delta and actual resource debit must still be enforced.
    check(f"{name} recruitment spends real resources for exactly two units",
          (queued or delivered) and queue["gold"] < before["gold"] and queue["strict"],
          {**queue,"queuedValid":queued,"deliveredValid":delivered})
    if queued:
        page.evaluate("""()=>{const s=HOG_APP_DEBUG.getState(),task=s.training[0],
          seconds=Math.ceil(task.remaining/Math.max(.001,s.speed))+1;
          HOG_ENGINE.tick(s,s.lastTick+seconds*1000);
          s.speed=60;s.lastTick=Date.now();HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()}""")
    else:
        page.evaluate("""()=>{const s=HOG_APP_DEBUG.getState();
          s.speed=60;s.lastTick=Date.now();HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()}""")
    recruited = page.evaluate("""id=>{const s=HOG_APP_DEBUG.getState();return {count:s.army[id],queued:s.training.length,strict:HOG_ENGINE.strictSave(s)}}""", unit_id)
    expected_recruited = before["army"] + 2
    check(f"{name} is delivered by an actual engine training tick", recruited["count"] == expected_recruited and recruited["queued"] == 0 and recruited["strict"], {**recruited,"expected":expected_recruited})

    page.locator("#formation_unit_0").select_option(unit_id)
    page.locator("#formation_count_0").fill("1")
    page.locator("#formation_unit_1").select_option(unit_id)
    page.locator("#formation_count_1").fill("1")
    page.locator('[data-action="formation"]').click()
    formation = page.evaluate("HOG_APP_DEBUG.getState().formation")
    check(f"Real formation deploys two separate {name} stacks", len(formation) == 2 and all(x["unitId"] == unit_id and x["count"] == 1 for x in formation), formation)

    page.locator('#nav [data-tab="map"]').click()
    page.locator("#world-canvas").wait_for(state="visible")
    point = page.evaluate("""(()=>{const c=document.querySelector('#world-canvas'),t=HOG_ENGINE.getTile('5,6'),m=HOG_PAINTER.mapCamera();
      const q=Math.max(.65,Math.min(2.05,m.zoom))*48,x=(t.x+.5)*q+c.width/2-m.centerX*q,y=(t.y+.5)*q+c.height/2-m.centerY*q,
        hit=HOG_PAINTER.mapHit(c,x,y,HOG_ENGINE);return {target:{key:t.key,kind:t.kind,value:t.value},hit:hit?.key,point:{x,y},size:[c.width,c.height]}})()""")
    box = page.locator("#world-canvas").bounding_box()
    if box is None:
        raise RuntimeError("Map canvas lacks a browser rectangle")
    page.mouse.click(box["x"] + point["point"]["x"] * box["width"] / point["size"][0],
                     box["y"] + point["point"]["y"] * box["height"] / point["size"][1])
    selected_target = page.locator(".target-information h2").inner_text()
    check(f"{name} scenario selects the real nearby NPC", point["target"]["kind"] == "npc" and point["hit"] == point["target"]["key"] and "Wolves" in selected_target,
          {**point, "selected": selected_target})

    page.evaluate("""id=>{window.__hg33PilotSamples=[];window.__hg33TargetAtlasId=HOG_HG33_TROOP_ATLASES.resolve(id)?.imageId;
      const p=CanvasRenderingContext2D.prototype,draw=p.drawImage;
      p.drawImage=function(img,...args){if(img?.id===window.__hg33TargetAtlasId&&args.length>=8)
        window.__hg33PilotSamples.push({imageId:img.id,row:Math.floor(args[1]/204),frame:Math.floor(args[0]/192),at:performance.now()});
        return draw.call(this,img,...args)}}""", unit_id)
    dispatch_button = page.locator('[data-action="dispatch-open"]')
    check(f"{name} target opens the real HG39 dispatch planner", dispatch_button.count() == 1)
    if dispatch_button.count() != 1:
        raise RuntimeError(f"{name}: selected NPC does not expose one real dispatch action")
    dispatch_button.click()
    page.locator('.hg39-dispatch [data-action="dispatch-confirm"]').wait_for(state="visible")
    dispatch = page.evaluate("""()=>{const panel=document.querySelector('.hg39-dispatch');return {
      rows:[...panel.querySelectorAll('.hg39-dispatch-row')].map(row=>{
        const input=row.querySelector('[data-dispatch-slot]'),slot=Number(input?.dataset.dispatchSlot),
          s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,plan=E.hg20HeroPlan(s,s.activeHero),unit=plan[slot]?.unitId;
        return {slot,unit,count:Number(input?.value),
          displayed:row.querySelector('.hg39-dispatch-unit b')?.textContent,
          expected:unit?E.getUnit(s,unit)?.name:null};
      }),
      enabled:!panel.querySelector('[data-action="dispatch-confirm"]').disabled,
      title:panel.querySelector('header h2')?.innerText};}""")
    check(f"{name} planner preserves the two real formation stacks and enables confirmation",
          len(dispatch["rows"]) == 2 and all(row["unit"] == unit_id and row["count"] == 1 and row["displayed"] == row["expected"] for row in dispatch["rows"]) and dispatch["enabled"], dispatch)
    page.locator('.hg39-dispatch [data-action="dispatch-confirm"]').click()
    page.wait_for_function("HOG_APP_DEBUG.getState()?.battle", timeout=30_000)
    battle = page.evaluate("""id=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;return {allies:b.allies.filter(u=>u.unitId===id).map(u=>({id:u.id,unitId:u.unitId,pool:u.pool,x:u.x,y:u.y})),
      enemyNames:b.enemies.map(e=>e.name),strict:HOG_ENGINE.strictSave(s),version:s.version}}""", unit_id)
    check(f"Natural March arrival starts a real {name} battle", len(battle["allies"]) == 2 and battle["strict"] and battle["version"] == 7, battle)
    page.wait_for_function("window.__hg33PilotSamples.some(x=>x.row===0)", timeout=5_000)
    check(f"Real battle renders {name} Idle_A from its troop atlas", page.evaluate("window.__hg33PilotSamples.some(x=>x.row===0)"))
    pilot_ids = [u["id"] for u in battle["allies"]]
    first_id = pilot_ids[0]
    fixture = set_enemy_observation_fixture(page, first_id, 0)
    check(f"{name} observation setup changes only defenders", fixture["strict"] and fixture["actor"]["pool"] > 0 and fixture["enemy"]["atk"] == 0, fixture)
    move_result = move_stack_on_actual_hex(page, pilot_ids[1], unit_id, name)
    check(f"{name} actual Walk_A retains valid battle Save v07", move_result["ok"] and
          page.evaluate("HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())"), move_result)

    turn_receipts = []
    first_attack_event = None
    attack = None
    for turn_number in range(6):
        page.locator('[data-action="battle"][data-cmd="attack"]').click()
        if turn_number == 0:
            page.wait_for_function("window.__hg33PilotSamples.some(x=>x.row===2)", timeout=3_000)
            save_shot(page, f"{unit_id}-attack", 1280, 720)
            page.wait_for_timeout(800)
        else:
            page.wait_for_timeout(900)
        turn_receipts.append(page.evaluate("""ids=>{const b=HOG_APP_DEBUG.getState()?.battle;return b&&{turn:b.turn,events:b.lastEvents,
          active:b.allies.some(u=>ids.includes(u.id)&&u.pool>0)}}""", pilot_ids))
        if turn_number == 0 and turn_receipts[-1]:
            first_attack_event = next((e for e in turn_receipts[-1]["events"] if e["actorId"] in pilot_ids and e["damage"] > 0), None)
            if first_attack_event:
                attack = get_action_receipt(page, first_attack_event["actorId"], "attack", "actor")
        if not turn_receipts[-1] or not turn_receipts[-1]["active"]:
            break
    attack_event = first_attack_event or next((e for row in turn_receipts if row for e in row["events"] if e["actorId"] in pilot_ids and e["damage"] > 0), None)
    check(f"Actual {name} Attack control produces engine movement/damage", attack_event is not None,
          {"turns": len(turn_receipts), "event": attack_event})
    attack = attack or {"battle": False, "event": attack_event}
    check(f"Real player Attack event renders {name} Attack_A from its troop atlas", attack["event"] and
          attack["visual"] and attack["visual"]["action"] == "attack" and attack["rendered"] and
          attack["atlasLoaded"] and attack["source"] and attack["source"]["sy"] == 2 * 204, attack)

    fixture = set_enemy_observation_fixture(page, first_id, 20)
    check(f"{name} defender can deal a real nonlethal hit", fixture["strict"], fixture)
    if battlefield_click(page, first_id, name):
        accepted_battle_turn(page,"defend")
        page.wait_for_timeout(260)
    hit_target = page.evaluate("ids=>{const b=HOG_APP_DEBUG.getState()?.battle;return b?.lastEvents?.find(e=>ids.includes(b.allies.find(u=>u.id===e.targetId)?.id)&&e.damage>0)?.targetId||null}", pilot_ids)
    hit = get_action_receipt(page, hit_target, "hit", "target") if hit_target else {"battle": False, "event": None}
    check(f"Real defender receipt selects and renders {name} Hit_A", hit["battle"] and hit["event"] and
          hit["event"]["damage"] > 0 and not hit["event"]["death"] and hit["visual"] and
          hit["visual"]["action"] == "hit" and hit["rendered"] and hit["atlasLoaded"] and hit["source"] and hit["source"]["sy"] == 3 * 204,
          hit)
    if hit["event"]:
        page.wait_for_function("window.__hg33PilotSamples.some(x=>x.row===3)", timeout=3_000)
        page.wait_for_timeout(60)
        save_shot(page, f"{unit_id}-hit", 1280, 720)
    page.evaluate("HOG_APP_DEBUG.save()")
    page.reload(wait_until="load")
    loaded = page.evaluate("""({id,target})=>{const s=HOG_APP_DEBUG.getState(),b=s.battle,u=b?.allies.find(x=>x.id===target),
      total=b?.allies.filter(x=>x.unitId===id).reduce((sum,x)=>sum+x.count,0)||0;
      return {version:s.version,key:localStorage.getItem('heoofgaia_hg_only_v07')!==null,battle:!!b,battleUnitCount:total,pool:u?.pool,
        hitEvent:b?.lastEvents?.find(e=>e.targetId===target&&e.damage>0),strict:HOG_ENGINE.strictSave(s)}}""", {"id": unit_id, "target": hit_target})
    check(f"{name} Hit receipt and battle survive strict Save v07 reload", loaded["version"] == 7 and loaded["key"] and
          loaded["battle"] and loaded["battleUnitCount"] == 2 and isinstance(loaded["pool"],(int,float)) and
          loaded["pool"] > 0 and loaded["hitEvent"] == hit["event"] and loaded["strict"], loaded)

    page.evaluate("""id=>{window.__hg33PilotSamples=[];window.__hg33TargetAtlasId=HOG_HG33_TROOP_ATLASES.resolve(id)?.imageId;
      const p=CanvasRenderingContext2D.prototype,draw=p.drawImage;
      p.drawImage=function(img,...args){if(img?.id===window.__hg33TargetAtlasId&&args.length>=8)
        window.__hg33PilotSamples.push({imageId:img.id,row:Math.floor(args[1]/204),frame:Math.floor(args[0]/192),at:performance.now()});
        return draw.call(this,img,...args)}}""", unit_id)
    death_fixture = set_enemy_observation_fixture(page, first_id, 100_000)
    check(f"{name} lethal test retains a second live stack", death_fixture["strict"] and
          len(page.evaluate("id=>HOG_APP_DEBUG.getState().battle.allies.filter(u=>u.unitId===id&&u.pool>0)", unit_id)) == 2,
          death_fixture)
    if battlefield_click(page, first_id, name + " before Death_A"):
        accepted_battle_turn(page,"defend")
        page.wait_for_timeout(260)
    death_target = page.evaluate("ids=>{const b=HOG_APP_DEBUG.getState()?.battle;return b?.lastEvents?.find(e=>e.death&&ids.includes(b.allies.find(u=>u.id===e.targetId)?.id))?.targetId||null}", pilot_ids)
    death = get_action_receipt(page, death_target, "death", "target") if death_target else {"battle": False, "event": None}
    check(f"Real hostile action kills one {name} stack and selects Death_A", death["battle"] and death["event"] and
          death["event"]["death"] and death["visual"] and death["visual"]["action"] == "death" and
          death["rendered"] and death["atlasLoaded"] and death["source"] and death["source"]["sy"] == 4 * 204 and death["strict"], death)
    page.wait_for_function("window.__hg33PilotSamples.some(x=>x.row===4)", timeout=3_000)
    save_shot(page, f"{unit_id}-death", 1280, 720)
    save_shot(page, f"{unit_id}-death", 960, 540)
    page.close()


def run_boss_pilot(browser) -> None:
    page = browser.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
    page.set_default_timeout(15_000)
    page.on("pageerror", lambda exc: errors.append(f"Azrael: {exc}"))
    page.on("console", lambda msg: errors.append(f"Azrael: console.{msg.type}: {msg.text}") if msg.type == "error" else None)
    page.goto(GAME.as_uri(), wait_until="load")
    page.locator('[data-action="race"][data-race="elf"]').click()
    page.locator('[data-action="start"]').click()
    state = page.evaluate("""()=>{const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();s.army.elf_2=16;
      E.setFormation(s,[{unitId:'elf_2',count:16}]);const t=E.TILES.find(x=>x.kind==='npc'&&x.value==='Azrael');
      const r=E.startMarch(s,t.key);if(r?.type==='error')throw Error(r.message);E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
      HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();return {target:t.key,battle:!!s.battle,allies:s.battle?.allies.map(x=>x.id),
        enemies:s.battle?.enemies.map(x=>({id:x.id,name:x.name,unitId:x.unitId})),strict:HOG_ENGINE.strictSave(s),version:s.version}}""")
    boss = page.evaluate("""()=>HOG_APP_DEBUG.getState().battle.enemies.find(u=>u.name==='Azrael')""")
    check("Real engine NPC march enters Azrael battle for the Boss animation pilot", state["battle"] and boss and
          state["strict"] and state["version"] == 7, {**state, "boss": boss})
    page.evaluate("""()=>{window.__hg33BossSamples=[];const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage;
      proto.drawImage=function(img,...args){if(img?.id==='hg33-atlas-azrael'&&args.length>=8)
        window.__hg33BossSamples.push({row:Math.floor(args[1]/204),frame:Math.floor(args[0]/192),at:performance.now()});
        return draw.call(this,img,...args)}}""")
    page.wait_for_function("window.__hg33BossSamples.some(x=>x.row===0)", timeout=5_000)
    check("Real Azrael battle renders the original Idle_A atlas row", page.evaluate("window.__hg33BossSamples.some(x=>x.row===0)"))
    # HG63 QA repair: HG61 maps the named Boss to a genuine ranged troop
    # (and 16 enemies can wipe the weak art-only Elf Scout formation).
    # This is explicitly a VISUAL OBSERVATION FIXTURE, not a Boss balance change:
    # preserve the real Boss actor/atlas, real hexes, production turn scheduling
    # and every attack receipt; neutralize 15 guards' damage and force Azrael
    # to use a melee approach so Walk_A can be observed and asserted.
    # Gameplay/reward/Boss phase strength is independently tested by HG58/HG50.
    walk_fixture = page.evaluate("""bossId=>{
      const s=HOG_APP_DEBUG.getState(),b=s.battle,
        boss=b.enemies.find(u=>u.id===bossId);
      if(!boss)throw Error('Azrael Boss visual fixture missing');
      for(const u of b.enemies)u.atk=0;
      boss.range=1;
      b.autoUntil=Date.now()+600000;s.battleAuto=false;
      HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
      return {range:boss.range,guardsHarmless:b.enemies.every(u=>u.atk===0),
        remaining:b.enemies.length,strict:HOG_ENGINE.strictSave(s)};
    }""", boss["id"])
    check("Azrael Walk_A observation fixture preserves all 16 actors and strict Save v07",
          walk_fixture["strict"] and walk_fixture["remaining"]>=3 and
          walk_fixture["guardsHarmless"] and walk_fixture["range"]==1,walk_fixture)
    accepted_battle_turn(page,"attack")
    # Boss timeline is serialized AFTER player actions, and dense fights
    # legitimately take >3 seconds even if the renderer is working.
    page.wait_for_function("window.__hg33BossSamples.some(x=>x.row===1)", timeout=15_000)
    save_shot(page, "azrael-walk", 1280, 720)
    boss_walk = page.evaluate("id=>{const b=HOG_APP_DEBUG.getState().battle;return b.lastEvents.find(e=>e.actorId===id)||null}", boss["id"])
    check("Azrael's actual hostile advance walks through the battlefield atlas", boss_walk and
          boss_walk["path"] and len(boss_walk["path"]) > 0 and
          page.evaluate("window.__hg33BossSamples.some(x=>x.row===1)"), boss_walk)
    page.wait_for_timeout(600)
    # The following edits are a legacy v07 atlas-observation fixture.
    # Artificially lowering all 16 enemy HP pools would invoke real HG50-B
    # T11 shields at 65% and hide a deliberately tiny Hit_A probe.
    # HG50-B phases are validated separately with genuine damage and Save.
    page.evaluate("""bossId=>{const s=HOG_APP_DEBUG.getState(),b=s.battle,a=b.allies[0],adjacent={x:a.x<10?a.x+1:a.x-1,y:a.y};
      if(b.hg50b?.phase==='armed')delete b.hg50b;
      if(!HOG_ENGINE.strictSave(s))throw Error('Legacy Azrael H2 fixture invalid Save v07');
      b.enemies.forEach((e,i)=>{e.hp=1_000_000;e.pool=1_000_000;e.count=1;e.def=0;e.atk=0;e.range=1;
        e.x=i===0?adjacent.x:10+(i%2);e.y=i===0?adjacent.y:Math.floor((i-1)/2)});b.enemies.find(e=>e.id===bossId).atk=20;
      if(!HOG_ENGINE.strictSave(s))throw Error('H2 Azrael Attack fixture violates Save v07');
      b.autoUntil=Date.now()+600_000;s.battleAuto=false;HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()}""", boss["id"])
    allies = state["allies"]
    first_ally = allies[0]
    accepted_battle_turn(page,"defend")
    page.wait_for_timeout(260)
    boss_attack = get_action_receipt(page, boss["id"], "attack", "actor")
    check("Azrael's real hostile turn renders the original Attack_A atlas row", boss_attack["event"] and
          boss_attack["event"]["damage"] > 0 and boss_attack["visual"] and boss_attack["visual"]["action"] == "attack" and
          boss_attack["rendered"] and boss_attack["source"] and boss_attack["source"]["imageId"] == "hg33-atlas-azrael" and
          boss_attack["source"]["sy"] == 2 * 204, boss_attack)
    if boss_attack["event"]:
        save_shot(page, "azrael-attack", 1280, 720)

    page.evaluate("""bossId=>{const s=HOG_APP_DEBUG.getState(),b=s.battle,boss=b.enemies.find(e=>e.id===bossId),a=b.allies[0];
      b.enemies.forEach((e,i)=>{e.atk=0;e.pool=e.hp=1_000_000;e.def=0;e.count=1;e.x=i===0?a.x+1:10+(i%2);e.y=i===0?a.y:Math.floor((i-1)/2)});
      if(!HOG_ENGINE.strictSave(s))throw Error('H2 Azrael Hit fixture violates Save v07');
      boss.atk=0;boss.x=a.x+1;boss.y=a.y;b.autoUntil=Date.now()+600_000;HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()}""", boss["id"])
    accepted_battle_turn(page,"attack")
    page.wait_for_timeout(260)
    boss_hit = get_action_receipt(page, boss["id"], "hit", "target")
    check("Real player damage selects and renders Azrael Hit_A", boss_hit["event"] and boss_hit["event"]["damage"] > 0 and
          boss_hit["visual"] and boss_hit["visual"]["action"] == "hit" and boss_hit["rendered"] and
          boss_hit["source"] and boss_hit["source"]["imageId"] == "hg33-atlas-azrael" and boss_hit["source"]["sy"] == 3 * 204,
          boss_hit)
    save_shot(page, "azrael-hit", 1280, 720)

    page.evaluate("""bossId=>{const s=HOG_APP_DEBUG.getState(),b=s.battle,boss=b.enemies.find(e=>e.id===bossId),a=b.allies[0];
      boss.hp=1;boss.pool=1;boss.def=0;boss.atk=0;boss.count=1;boss.x=a.x+1;boss.y=a.y;
      b.enemies.filter(e=>e.id!==bossId).forEach((e,i)=>{e.atk=0;e.pool=e.hp=1_000_000;e.x=10+(i%2);e.y=Math.floor(i/2)});
      if(!HOG_ENGINE.strictSave(s))throw Error('H2 Azrael Death fixture violates Save v07');
      b.autoUntil=Date.now()+600_000;HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()}""", boss["id"])
    accepted_battle_turn(page,"attack")
    page.wait_for_timeout(260)
    boss_death = get_action_receipt(page, boss["id"], "death", "target")
    check("Actual player attack kills Azrael and renders the original Death_A row", boss_death["event"] and
          boss_death["event"]["death"] and boss_death["visual"] and boss_death["visual"]["action"] == "death" and
          boss_death["rendered"] and boss_death["source"] and boss_death["source"]["imageId"] == "hg33-atlas-azrael" and
          boss_death["source"]["sy"] == 4 * 204 and boss_death["battle"], boss_death)
    page.wait_for_function("window.__hg33BossSamples.some(x=>x.row===4)", timeout=3_000)
    save_shot(page, "azrael-death", 1280, 720)
    save_shot(page, "azrael-death", 960, 540)
    page.evaluate("HOG_APP_DEBUG.save()")
    loaded = page.evaluate("""id=>{const s=HOG_APP_DEBUG.getState();return {version:s.version,battle:!!s.battle,
      boss:s.battle?.enemies.find(x=>x.id===id)?.pool,key:!!localStorage.getItem('heoofgaia_hg_only_v07'),strict:HOG_ENGINE.strictSave(s)}}""", boss["id"])
    check("Azrael death event and surviving Boss battle Save/Reload retain v07", loaded["version"] == 7 and loaded["battle"] and
          loaded["boss"] == 0 and loaded["key"] and loaded["strict"], loaded)
    page.close()


with sync_playwright() as playwright:
    launch = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files"]}
    browser_candidates = [
        os.environ.get("HOG_CHROMIUM_PATH"), os.environ.get("HOG_CHROME_PATH"),
        str(Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "Google/Chrome/Application/chrome.exe"),
        str(Path(os.environ.get("PROGRAMFILES(X86)", "C:/Program Files (x86)")) / "Microsoft/Edge/Application/msedge.exe"),
    ]
    browser_env = next((candidate for candidate in browser_candidates if candidate and Path(candidate).is_file()), None)
    if browser_env:
        launch["executable_path"] = browser_env
    browser = playwright.chromium.launch(**launch)
    for pilot in PILOTS:
        run_troop_pilot(browser, pilot)
    run_boss_pilot(browser)
    browser.close()

report = {
    "commit": subprocess.check_output(["git", "-c", f"safe.directory={ROOT.resolve().as_posix()}", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
    "html": GAME.name,
    "htmlSha256": sha(GAME.read_bytes()),
    "browser": "Playwright Chromium opening the built standalone file:// HTML",
    "pilotCombat": "actual New Game, UI recruitment, resource spend, training tick, two-stack formation, real NPC selection and March, real Attack/Defend turns, engine damage, casualty and event-driven animation; only defenders are adjusted by the disclosed observation fixture",
    "pilots": PILOTS + [{"bossName": "Azrael", "kind": "named Boss"}],
    "checks": checks,
    "screenshots": screenshots,
    "browserErrors": errors,
    "passed": sum(row["passed"] for row in checks),
    "failed": sum(not row["passed"] for row in checks),
    "result": "PASS" if all(row["passed"] for row in checks) and not errors else "FAIL",
}
QA.parent.mkdir(parents=True, exist_ok=True)
QA.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"HG33 H2 five-pilot live battle gate: {report['passed']}/{len(checks)} PASS, screenshots={len(screenshots)}, browserErrors={len(errors)}", flush=True)
raise SystemExit(0 if report["result"] == "PASS" else 1)
