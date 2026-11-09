"""HG40.3 Visual Gate: actual file:// Chromium, canonical battleActCore receipts
and the shipping Canvas painter for each of 40 troop/skill IDs.

40 impact paintings are engine-backed controlled PvE fixtures. They are NOT
40 organically encountered campaigns, nor proof of 200 genuine animation clips.
The independent HG28 source coverage report remains authoritative for those.
"""
from pathlib import Path
import base64
import hashlib
import json
import os
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent
HTML = ROOT / "Play-Heoofgaia-HG11.html"
ART = ROOT / "docs/evidence/hg403/visual-gate"
QA = ROOT / "docs/qa/hg403"
ART.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
errors = []
checks = []

def gate(name, condition, details=None):
    passed = bool(condition)
    checks.append({"name": name, "pass": passed, "details": details})
    print(("PASS " if passed else "FAIL ") + name + " " +
          json.dumps(details, ensure_ascii=False)[:220], flush=True)

def write_png(name, data_url):
    assert data_url.startswith("data:image/png;base64,"), name
    raw = base64.b64decode(data_url.split(",", 1)[1])
    path = ART / name
    path.write_bytes(raw)
    return {"path": str(path.relative_to(ROOT)),
            "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}

coverage = json.loads((ROOT / "assets/animations/hg28/coverage.json").read_text(encoding="utf-8"))
actions = ["idle", "walk", "attack", "hit", "death"]
source_full = sum(all(u["actions"].get(a) for a in actions) for u in coverage["units"])
source_clips = sum(sum(bool(u["actions"].get(a)) for a in actions) for u in coverage["units"])

with sync_playwright() as pw:
    launch = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage",
                                         "--allow-file-access-from-files"]}
    if os.environ.get("HOG_CHROME_PATH"):
        launch["executable_path"] = os.environ["HOG_CHROME_PATH"]
    browser = pw.chromium.launch(**launch)
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(HTML.as_uri(), wait_until="load")
    page.locator('[data-action="start"]').click()
    # A real New Game remains untouched. Controlled PvE copies exist only in JS
    # memory and use battleActCore/Canvas, not injected awards or saved fixtures.
    result = page.evaluate("""async () => {
      const E=HOG_ENGINE,C=HOG_CATALOG,P=HOG_PAINTER,A=HOG_HG33_TROOP_ATLASES;
      const races=['human','elf','orc','undead'],actions=['idle','walk','attack','hit','death'];
      const passive=new Set(['guard','rangedGuard','meleeGuard','firstGuard',
        'thirdBonus','thirdPierce','rage','wounded','antiMelee','antiRanged']);
      const record=[],sheets={},errors=[],game=HOG_APP_DEBUG.getState();
      const armyBefore=JSON.stringify(game.army),saveVersion=game.version;
      const npctile=E.NPC_CAMPS_2009.find(x=>x.level===1)||E.NPC_CAMPS_2009[0];
      function overlaps(a,b){
        return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
      }
      for(const race of races){
        const sheet=document.createElement('canvas');
        sheet.width=1100;sheet.height=1530;
        const sc=sheet.getContext('2d',{willReadFrequently:true});
        sc.fillStyle='#132529';sc.fillRect(0,0,sheet.width,sheet.height);
        for(let tier=1;tier<=10;tier++){
          const id=race+'_'+tier,unit=C.units[race][tier-1],trait=E.HG40_TRAITS[id];
          let recordRow={unitId:id,skill:trait?.name||null,kind:trait?.kind||null,
            mode:passive.has(trait?.kind)?'passive-presence-with-real-hit':'reactive-confirmed-on-real-hit',
            atlasActions:{},damage:0,round:0,skillLogged:false,vfxPixels:0,
            hpHudSafe:false,hexFoot:false,hitbox:false,errors:[]};
          try{
            const atlas=A.resolve(id),img=atlas&&document.getElementById(atlas.imageId);
            if(!atlas||!img)throw Error('Missing atlas/image: '+id);
            if(!img.hasAttribute('src'))img.src=img.dataset.hg33AtlasSrc;
            await img.decode();
            for(const action of actions){
              const clip=atlas.actions[action];
              const frame=P.troopAtlasFrame(id,action,Math.floor(clip.durationMs*.55),
                clip.durationMs,unit.name);
              const ac=document.createElement('canvas');ac.width=160;ac.height=160;
              const painted=P.battleUnitArt(ac.getContext('2d'),80,144,false,
                {action,time:Math.floor(clip.durationMs*.55),duration:clip.durationMs,alpha:1},
                .65,{unitId:id,name:unit.name});
              recordRow.atlasActions[action]=!!painted&&Number.isInteger(frame.frame)&&frame.row===actions.indexOf(action);
            }
            const s=E.make(race,1000000+tier);s.army[id]=12;
            const actor={id:'p0',unitId:id,name:unit.name,side:'player',
              hp:unit.hp,atk:unit.atk,def:unit.def,spd:unit.spd,
              range:E.unitTacticalRange(unit),count:12,initial:12,
              pool:unit.hp*12,slot:0,x:1,y:4};
            const enemy=(eid,x,y)=>({id:eid,unitId:null,name:'Durable enemy',
              // Low-DEF but high-HP target: HG40.9 purple enemy commander now
              // raises real DEF. Visual impact gate must observe a nonzero hit
              // from every low-tier troop; balance difficulty is audited separately.
              side:'enemy',hp:100000,atk:0,def:8,spd:1,
              range:1,count:1000,initial:1000,pool:100000000,x,y});
            const b={target:npctile.key,kind:'npc',level:1,name:'Visual gate',turn:1,
              order:'attack',orders:{},focused:null,selected:'p0',autoUntil:1000000,
              allies:[actor],enemies:[enemy('e0',2,4),enemy('e1',3,4)],
              woundedByUnit:{},history:[],moveTargets:{}};
            E.hg40PrepareBattle(s,b);s.battle=b;
            // HG44-A/E: HG41 deliberately redeploys each side across the
            // 12x9 board. This is a CONTROLLED skill/Canvas fixture, not an
            // organic march: arrange one real target 2 hexes from the actor
            // AFTER canonical preparation, then let battleActCore move and
            // strike. A second adjacent enemy allows legitimate AoE procs.
            // Nobody receives fictitious combat receipts or rewards.
            actor.x=2;actor.y=4;
            b.enemies.forEach((foe,i)=>{
              if(i===0){foe.x=4;foe.y=4;}
              else if(i===1){foe.x=5;foe.y=4;}
              else {foe.x=10+i%2;foe.y=Math.min(8,1+2*Math.floor((i-2)/2));}
            });
            if(trait.kind==='heal'||trait.kind==='lifesteal')actor.pool=actor.hp*5;
            if(trait.kind==='cleanse')b.hg40.statuses.push({
              target:'p0',kind:'slow',value:1,source:'enemy',starts:1,until:4});
            if(trait.kind==='multiShield')b.allies.push({...actor,id:'p1',x:1,y:5});
            // Charge now uses the real same-action move+hit from (2,4) to
            // the nearby (4,4) target. No artificial 9-range enemy required.
            if(trait.kind==='killBuff'){
              b.enemies[0].hp=10;b.enemies[0].count=3;
              b.enemies[0].initial=3;b.enemies[0].pool=30;
            }
            let event=null,logged=false;
            for(let turn=0;turn<9&&s.battle;turn++){
              const round=b.turn;
              const outcome=E.battleActCore(s,'attack',{stableTargets:true});
              const hit=b.lastEvents.find(x=>x.actorId==='p0'&&x.damage>0);
              const proc=b.hg40.lastSkills.some(n=>n.turn===round&&n.skill===trait.name&&
                n.detail.startsWith(actor.name+' kích hoạt '));
              if(hit&&(!passive.has(trait.kind)?proc:true)){
                event=hit;logged=proc;recordRow.round=round;
                break;
              }
              if(outcome.type!=='continue')break;
            }
            if(!event)throw Error('No matched canonical impact/skill receipt in 9 rounds: '+id);
            recordRow.damage=event.damage;recordRow.skillLogged=logged;
            const c=document.createElement('canvas');c.width=960;c.height=480;
            const cc=c.getContext('2d',{willReadFrequently:true});
            const start=performance.now();
            P.battleTimelinePrime(b,start,true);
            const timeline=P.battleTimelineFor(b,start);
            const impact=timeline.items.find(x=>x.event.actorId==='p0'&&
              x.event.damage>0);
            if(!impact)throw Error('Canonical impact missing from battle timeline');
            const at=impact.impactAt+95,cam=P.battleProjection(c,E);
            const layout=P.battleUnitLayout(b,cam,c.width,c.height,at);
            const fx=P.battleFxPlan(b,cam,at,layout);
            const receipt=fx.find(x=>x.actorId==='p0'&&x.damage===event.damage);
            if(!receipt)throw Error('Canvas impact does not match engine receipt');
            recordRow.hexFoot=layout.every(x=>{
              const p=cam.center(x.u.x,x.u.y);
              return Math.abs(x.baseX-p.x)<.0001&&Math.abs(x.baseY-p.y)<.0001;
            });
            // HG44-E: Scouts (tier 2, SPD=50) legitimately animate along
            // their recorded hex route at this impact timestamp. Clicking
            // their FINAL logical coordinate before Walk ends is not a test
            // of the actually drawn sprite/hitbox. Query the same visible
            // foot projection used by the shipping painter and tap that.
            const actorVisual=P.battleVisualState(b,actor,at,at),
              actorFoot=P.battleVisualPoint(cam,actorVisual,actor);
            recordRow.hitbox=P.battleHit(c,actorFoot.x,actorFoot.y,E,s,at)?.id==='p0';
            const hudW=Math.max(155,Math.min(235,c.width*.205));
            const reserved=[
              {x:12,y:9,w:hudW,h:37},
              {x:c.width/2-58,y:9,w:116,h:37},
              {x:c.width-12-hudW,y:9,w:hudW,h:37},
              {x:12,y:c.height-36,w:c.width-24,h:27}
            ];
            // Dead actors legitimately have no live HP/name card.
            recordRow.hpHudSafe=layout.filter(e=>e.displayPool>0).every(e=>
              !!e.label&&!reserved.some(rect=>overlaps(e.label,rect)));
            P.drawBattle(c,E,s,at,{showGrid:true,showHP:true});
            // Compare the real *playfield* instead of an arbitrary 120px
            // square around the final target cell. Fast Scout (SPD=50)
            // attacks can animate away from that cell while their legit
            // skill mark is visibly on the active route. Exclude top HUD
            // and bottom battle ticker, so HUD text alone cannot pass VFX.
            const fieldY=60,fieldH=c.height-100;
            const visible=cc.getImageData(0,fieldY,c.width,fieldH).data;
            // With identical canonical receipts but HG40 identity hidden,
            // only actual drawn, in-bounds skill presentation can differ.
            const original=b.hg40;b.hg40=null;
            try{P.drawBattle(c,E,s,at,{showGrid:true,showHP:true});}
            finally{b.hg40=original;}
            const control=cc.getImageData(0,fieldY,c.width,fieldH).data;
            let delta=0;
            for(let i=0;i<visible.length;i+=4)
              if(Math.abs(visible[i]-control[i])+Math.abs(visible[i+1]-control[i+1])+
                 Math.abs(visible[i+2]-control[i+2])>18)delta++;
            recordRow.vfxPixels=delta;
            if(tier===2){
              const actorLayout=layout.find(e=>e.id==='p0');
              recordRow.diagnostic={
                logical:{x:actor.x,y:actor.y,pool:actor.pool,count:actor.count},
                receipt:{damage:event.damage,path:event.path,to:event.to,from:event.from},
                timeline:{round:impact.round,start:impact.start,impactAt:impact.impactAt,moveMs:impact.moveMs,attackMs:impact.attackMs,
                  actorEvent:impact.event.actorId,targetEvent:impact.event.targetId},
                sampleTime:at,actorVisual:actorVisual,
                visibleFoot:actorFoot,
                rawFoot:cam.center(actor.x,actor.y),
                hitAtVisible:P.battleHit(c,actorFoot.x,actorFoot.y,E,s,at)?.id||null,
                hitAtRaw:P.battleHit(c,cam.center(actor.x,actor.y).x,cam.center(actor.x,actor.y).y,E,s,at)?.id||null,
                actorLayout:{x:actorLayout?.x,y:actorLayout?.y,pool:actorLayout?.displayPool},
                effects:fx.filter(x=>x.actorId==='p0').map(x=>({kind:x.kind,start:x.start,end:x.end,time:x.time,impactMs:x.impactMs})),
                cueCount:b.hg40?.lastSkills.length,
                renderedDelta:delta
              };
            }
            P.drawBattle(c,E,s,at,{showGrid:true,showHP:true});
            const col=(tier-1)%2,row=Math.floor((tier-1)/2),sx=col*550,sy=row*306;
            sc.fillStyle='#10272c';sc.fillRect(sx,sy,550,306);
            sc.drawImage(c,sx+5,sy+32,540,270);
            sc.fillStyle=recordRow.vfxPixels>20?'#abf0c4':'#f7b4aa';
            sc.font='bold 16px sans-serif';sc.textAlign='left';
            sc.fillText(id+' · '+trait.name+' · '+recordRow.mode.split('-')[0],sx+12,sy+23);
            record.push(recordRow);
          }catch(e){
            recordRow.errors.push(String(e.stack||e));record.push(recordRow);errors.push(id+': '+String(e.stack||e));
          }
        }
        sheets[race]=sheet.toDataURL('image/png');
      }
      const saveValid=saveVersion===7&&game.version===7&&E.strictSave(game);
      const ids=record.map(x=>x.unitId);
      return {entries:record,sheets,errors,saveUnchanged:armyBefore===JSON.stringify(game.army),saveValid,
        count:record.length,uniqueUnits:new Set(ids).size,
        browserCanvas:true,source:'battleActCore + original painter.js in Chromium'};
    }""")
    sheets = result.pop("sheets")
    images = [write_png("hg403-" + race + "-10-real-combat-skill-canvas.png", data)
              for race, data in sheets.items()]
    rows = result["entries"]
    for scout in rows:
        if scout['unitId'].endswith('_2'):
            print('HG44 SCOUT DIAGNOSTIC '+json.dumps({'id':scout['unitId'],
                'skill':scout['skill'],'hitbox':scout['hitbox'],
                'vfxPixels':scout['vfxPixels'],'diagnostic':scout.get('diagnostic')},
                ensure_ascii=False)[:2200],flush=True)
    reactive = [r for r in rows if r["mode"].startswith("reactive")]
    passive = [r for r in rows if r["mode"].startswith("passive")]
    gate("40 unique troops and skill receipts painted by the real Chromium Canvas",
         result["count"] == 40 and result["uniqueUnits"] == 40 and
         len(images) == 4 and not result["errors"],
         {"units": result["uniqueUnits"], "errors": result["errors"][:8]})
    gate("27 reactive skills confirm an actual same-round activation and rendered impact",
         len(reactive) == 27 and all(r["skillLogged"] and r["damage"] > 0 for r in reactive),
         {"reactive": len(reactive), "missing": [r["unitId"] for r in reactive if not r["skillLogged"]]})
    gate("13 passive-skill owners retain a real damage impact (not fabricated proc)",
         len(passive) == 13 and all(r["damage"] > 0 for r in passive),
         {"passives": len(passive), "missing": [r["unitId"] for r in passive if not r["damage"]]})
    gate("every impact actually changes the shipped skill Canvas pixels",
         all(r["vfxPixels"] > 20 for r in rows),
         {"minimumDelta": min((r["vfxPixels"] for r in rows), default=0),
          "missing": [r["unitId"] for r in rows if r["vfxPixels"] <= 20]})
    gate("40 x 5 decoded gameplay atlas action rows rendered in Chromium",
         all(len(r["atlasActions"]) == 5 and all(r["atlasActions"].values()) for r in rows),
         {"actions": sum(sum(r["atlasActions"].values()) for r in rows), "required": 200})
    gate("all 40 per-troop visual fixtures keep canonical hex feet and selectable unit",
         all(r["hexFoot"] and r["hitbox"] for r in rows),
         {"bad": [r["unitId"] for r in rows if not r["hexFoot"] or not r["hitbox"]]})
    gate("name/HP plates do not intersect the top HUD, round count or combat ticker",
         all(r["hpHudSafe"] for r in rows),
         {"bad": [r["unitId"] for r in rows if not r["hpHudSafe"]]})
    gate("New Game Save v07 remains strict and the controlled fixtures never change its army",
         result["saveUnchanged"] and result["saveValid"],
         {"armyUnchanged": result["saveUnchanged"], "strictSave": result["saveValid"]})
    gate("no Chromium page JavaScript errors", not errors, errors)
    browser.close()

gate("HG40.3 AF40 source animation manifest records all independently-authored five-action rows",
     len(coverage["units"]) == 40 and source_full == 40 and source_clips == 200 and
     coverage.get("newSourceClips") == 178,
     {"fullSourceUnits": source_full, "sourceClips": source_clips,
      "recoveredOriginalHg33Rows": coverage.get("newSourceClips"), "needed": 200})
report = {
    "schema": "HG40.3-VisualGate-Chromium-v1",
    "status": "PASS" if all(c["pass"] for c in checks) else "FAIL",
    "checks": checks, "entries": rows, "images": images,
    "animation": {"renderableTroops": 40, "renderableActionRows": 200,
                  "verifiedIndependentFullSourceTroops": source_full,
                  "verifiedIndependentSourceActionClips": source_clips,
                  "totalRequiredIndependentSourceActionClips": 200,
                  "independentSourceComplete": source_full == 40 and source_clips == 200},
    "replayNote": "Controlled battleActCore scenarios, actual shipping Chromium Canvas. 27 genuine logged procs; 13 passive presence with real impact but NOT asserted proc.",
    "gameplayNote": "40/40 eight-frame source rows are registered and separately SHA/pose verified; animation art continuity, physical foot tracking in all poses and Android hardware remain distinct visual release gates. These are controlled real gameplay hits, not organic campaign progression.",
    "sourceHtmlSha256": hashlib.sha256(HTML.read_bytes()).hexdigest()
}
(QA / "chromium-40-visual-gate.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("HG40.3 VISUAL GATE " + str(sum(c["pass"] for c in checks)) +
      "/" + str(len(checks)) + " " + report["status"] +
      " | true animation clips " + str(source_clips) + "/200", flush=True)
sys.exit(0 if report["status"] == "PASS" else 1)
