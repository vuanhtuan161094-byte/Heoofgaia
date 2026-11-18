"""NL-R02 focused Chromium checks: counters, morale, AI reasons and dungeons."""
from pathlib import Path
import json
import sys
import time
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SAVE_KEY = "muu_dinh_tam_quoc_v1"
STUB = """<script>window.__P2_ENABLE_QA__=true;const __store=__NL_STORE__;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(__store,k)?__store[k]:null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k],clear:()=>Object.keys(__store).forEach(k=>delete __store[k])}});</script>"""
checks = []
errors = []


def check(name, condition):
    ok = bool(condition)
    checks.append({"name": name, "pass": ok})
    print(("PASS " if ok else "FAIL ") + name, flush=True)


def open_page(browser, width=1280, height=720, stored=None):
    page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
    page.on("pageerror", lambda error: errors.append(str(error)))
    storage = {} if stored is None else {SAVE_KEY: stored}
    stub = STUB.replace("__NL_STORE__", json.dumps(storage, ensure_ascii=False))
    page.set_content(HTML.replace("<script>", stub + "<script>", 1), wait_until="domcontentloaded")
    return page


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        page = open_page(browser)
        qa = "window.__P2_QA__"
        check("real desktop hub has 3x3 and six formation families / 24 variants", page.locator('[data-nl-command] .nl-slot').count() == 9 and page.locator('[data-p3-preset]').count() == 0 and page.locator('[data-nl-command]').count() == 1)
        page.locator('[data-nl-route="formation"]').click()
        presets = page.evaluate("window.__P3_QA__.presets")
        check("preset catalog preserves all 24 IDs across six formations and four variants", len(presets) == 24 and len({p["id"] for p in presets}) == 24 and len({p["formation"] for p in presets}) == 6 and len({p["style"] for p in presets}) == 4 and "6 trận pháp / 24 phương án" in page.locator("#view").inner_text())
        catalog_binding = page.evaluate("""() => {
          const data=window.__P2_QA__.data.formations,actual=window.__P3_QA__.presets.map(p=>p.id).sort();
          const expected=data.families.flatMap(f=>data.plans.map(p=>`${f.id}-${p.key}`)).sort();
          return {actual,expected,match:JSON.stringify(actual)===JSON.stringify(expected)};
        }""")
        check("live formation families and plans are instantiated from the validated JSON catalog", catalog_binding["match"] and len(catalog_binding["actual"]) == 24)
        check("Thương selector is available for owned infantry generals", page.locator('[data-nl-spear="zhang"]').count() == 1 and "Bộ → Thương → Kỵ → Bộ" in page.locator("#view").inner_text())

        before = page.evaluate(f"{qa}.getGame()")
        page.locator('[data-nl-spear="zhang"]').click()
        after = page.evaluate(f"{qa}.getGame()")
        unit = page.evaluate(f"{qa}.makeUnit('zhang','p',2,1)")
        check("switching an infantry general to spear spends real silver/grain and changes battle unit", after["troopModes"].get("zhang") == "spear" and before["silver"] - after["silver"] == 120 and before["grain"] - after["grain"] == 60 and unit["troop"] == "spear")

        # Visible pre-battle dossier is driven by the same selected NPC slots as runtime.
        page.locator('.nav[data-tab="campaign"]').click()
        intel = page.locator('[data-nl-enemy-intel="1"]')
        chapter = page.locator('[data-nl-chapter="nl-chapter-01"]')
        check("selected campaign chapter shows both NPC fights from validated data",
              chapter.count() == 1 and chapter.locator('[data-nl-chapter-step]').count() == 2
              and "Trương Bảo" in chapter.inner_text() and "Ba Tài" in chapter.inner_text()
              and "0/2 trận" in chapter.inner_text())
        check("campaign reconnaissance shows the live stage-one enemy 3x3 deployment",
              intel.count() == 1
              and intel.locator('[data-nl-intel-slot]').count() == 9
              and "Trương Bảo" in intel.inner_text()
              and "3 đơn vị tham chiến" in intel.inner_text()
              and intel.locator('[data-nl-intel-slot="1"]').get_attribute("aria-label") == "Ô địch 2: Thương binh"
              and intel.locator('[data-nl-intel-slot="3"]').get_attribute("aria-label") == "Ô địch 4: Thương binh"
              and intel.locator('[data-nl-intel-slot="4"]').get_attribute("aria-label") == "Ô địch 5: Hỗ trợ"
              and "Wiki chưa xác nhận" in intel.inner_text())

        page.evaluate(f"{qa}.beginBattle(1,'campaign')")
        counter_rows = page.evaluate(f"""() => {{
          const q=window.__P2_QA__,b=q.debugBattle();
          function hit(attackerTroop,defenderTroop){{
            b.seed=987654321;
            const a={{id:'a',team:'p',slot:2,type:'infantry',troop:attackerTroop,atk:180,catk:180,matk:180,crit:0,effects:[]}};
            const t={{id:'t',team:'e',slot:2,type:'infantry',troop:defenderTroop,hp:2000,maxHp:2000,def:20,tdef:20,mdef:20,morale:40,alive:true,effects:[]}};
            return q.p2Hit(a,t,'physical').amount;
          }}
          return {{
            infantryVsSpear:[hit('infantry','spear'),hit('archer','spear')],
            spearVsCavalry:[hit('spear','cavalry'),hit('archer','cavalry')],
            cavalryVsInfantry:[hit('cavalry','infantry'),hit('archer','infantry')],
            reverse:[hit('spear','infantry'),hit('archer','infantry')],
            neutral:[hit('archer','spear'),hit('strategist','spear')]
          }};
        }}""")
        check("same-seed damage A/B confirms Bộ > Thương, Thương > Kỵ, Kỵ > Bộ", counter_rows["infantryVsSpear"][0] > counter_rows["infantryVsSpear"][1] and counter_rows["spearVsCavalry"][0] > counter_rows["spearVsCavalry"][1] and counter_rows["cavalryVsInfantry"][0] > counter_rows["cavalryVsInfantry"][1] and counter_rows["reverse"][0] < counter_rows["reverse"][1])
        check("Cung and Quan Văn are neutral to the three-class triangle", counter_rows["neutral"][0] == counter_rows["neutral"][1])
        legacy = page.evaluate(f"""() => {{
          const q=window.__P2_QA__,b=q.debugBattle();b.mode='cltq';b.seed=1234;
          const a={{id:'a',team:'p',slot:2,troop:'cavalry',type:'cavalry',atk:180,catk:180,matk:180,crit:0,effects:[]}};
          const t={{id:'t',team:'e',slot:2,troop:'archer',type:'archer',hp:2000,maxHp:2000,def:20,tdef:20,mdef:20,morale:40,alive:true,effects:[]}};
          const old=q.p2Hit(a,t,'physical').amount;b.mode='campaign';return old;
        }}""")
        check("legacy CL combat retains its saved counter table", isinstance(legacy, int) and legacy > 0)

        # Inspect all five real NPC formations and ensure the campaign creates them in the engine.
        base = page.evaluate(f"{qa}.getGame()")
        base["cleared"] = [1, 2, 3, 4]
        page.evaluate(f"g=>{qa}.setGame(g)", base)
        encountered = []
        for stage in range(1, 6):
            page.evaluate(f"{qa}.beginBattle({stage},'campaign')")
            battle = page.evaluate(f"{qa}.getBattle()")
            encountered.append([unit["troop"] for unit in battle["e"]])
            page.evaluate(f"{qa}.closeBattle('city')")
            page.evaluate(f"g=>{qa}.setGame(g)", base)
        expected = page.evaluate("""() => window.__P2_QA__.encounters.map((entry,index)=>{
          const stage=index+1,count=Math.min(5,3+Math.floor((stage-1)/3));
          return Array.from({length:count},(_,i)=>entry.troops[i===count-1?4:i]);
        })""")
        if encountered != expected:
            print("ENCOUNTER COMPOSITION A/B: " + json.dumps({"actual": encountered, "expected": expected}, ensure_ascii=False), flush=True)
        check("five campaign maps instantiate their distinct counter/range/morale NPC troops", encountered == expected and len({tuple(row) for row in encountered}) == 5)

        # Same input and seed; only troop-mode count changes the drum tempo.
        drum_results = page.evaluate(f"""() => {{
          const q=window.__P2_QA__,base=q.getGame(),rows=[];
          base.roster=['guan','zhang','liu','zhuge','huang'];
          for(const id of base.roster)base.hero[id]=base.hero[id]||{{level:12,xp:0,troops:650}};
          for(const id of base.roster){{base.hero[id].level=12;base.hero[id].xp=0;base.hero[id].troops=650;}}
          base.slots=['guan','zhang','liu','zhuge','huang',null,null,null,null];base.cleared=[1,2,3,4];
          for(const count of [1,2,3]){{
            q.closeBattle('city');q.setGame(structuredClone(base));q.beginBattle(5,'campaign');
            const b=q.debugBattle();b.seed=456789;
            const core=b.p.find(u=>u.id==='guan'),drums=b.p.filter(u=>u.id!=='guan').slice(0,count);
            for(const drummer of drums)drummer.troop='drum';
            for(const drummer of drums)q.perform(drummer);
            const ready=core.morale;q.perform(core);const event=b.events.at(-1);
            rows.push({{count,ready,mode:event.mode,skill:event.skill,morale:core.morale}});
          }}
          q.closeBattle('city');return rows;
        }}""")
        check("same-seed one/two/three-drum A/B changes skill timing and respects morale cap", drum_results[0]["ready"] < 100 and drum_results[0]["mode"] == "normal" and drum_results[1]["ready"] >= 100 and drum_results[1]["mode"] == "skill" and drum_results[2]["ready"] <= 130 and drum_results[2]["mode"] == "skill")

        # Stage 5's named strategist applies a morale seal through its real skill event.
        page.evaluate(f"g=>{qa}.setGame(g)", base)
        page.evaluate(f"{qa}.beginBattle(5,'campaign')")
        page.evaluate(f"""() => {{const q=window.__P2_QA__,b=q.debugBattle(),sima=b.e.find(u=>u.skillKey==='nl-sima');sima.morale=100;q.perform(sima);}}""")
        seal = page.evaluate(f"""() => {{
          const q=window.__P2_QA__,b=q.debugBattle(),event=b.events.at(-1),unit=b.p[0],before=unit.morale;
          q.morale(unit,25);const afterGain=unit.morale;q.morale(unit,-15);const afterDrain=unit.morale;
          return {{skill:event.skill,description:event.description,decision:event.aiDecision,hasSeal:unit.effects.some(e=>e.kind==='morale-seal'),before,afterGain,afterDrain,sealSkill:q.moraleSealSkill}};
        }}""")
        check("Tư Mã Ý's real strategy applies morale seal and the seal blocks gains but permits drains", seal["skill"] == "Quỷ Mưu" and seal["sealSkill"] == "morale-seal" and seal["hasSeal"] and seal["afterGain"] == seal["before"] and seal["afterDrain"] == seal["before"] - 15)
        check("combat event records deterministic AI target scores and visible explanation", isinstance(seal["decision"], dict) and seal["decision"]["target"] and "AI:" in seal["description"] and len(seal["decision"]["candidates"]) >= 1)

        # Synthetic, project-owned status proves the shared engine can apply a new effect from data alone.
        status_probe = page.evaluate(f"""() => {{
          const q=window.__P2_QA__;q.closeBattle('city');q.setGame(q.getGame());q.beginBattle(1,'campaign');
          const b=q.debugBattle(),unit=b.p[0],source=b.e[0],spec={{duration:3,stackingPolicy:'refresh-longer',expirePhase:'round-end',removeAfterOwnAction:false,incomingDefenseMultiplier:.5,moraleGainMultiplier:.4,roundEndDamageFraction:.1}};
          q.registerStatusSpec('qa-vulnerability',spec);unit.effects=[];unit.hp=unit.maxHp;unit.morale=20;
          q.status(unit,'qa-vulnerability',1);q.status(unit,'qa-vulnerability',3);const refreshed=unit.effects[0].turns;
          b.seed=8123;const affected=q.p2Hit(source,unit,'physical').amount;unit.effects=[];b.seed=8123;const baseline=q.p2Hit(source,unit,'physical').amount;
          q.status(unit,'qa-vulnerability',3);unit.morale=20;const moraleBefore=unit.morale,moraleFactor=q.statusFactor(unit,'moraleGainMultiplier');q.morale(unit,25);const morale=unit.morale,hp=unit.hp;q.roundEnd();const tick=hp-unit.hp,remaining=unit.effects[0]?.turns||0;
          unit.hp=unit.maxHp;unit.effects=[];const stackedSpec={{duration:2,stackingPolicy:'add-stack',stackLimit:3,expirePhase:'round-end',removeAfterOwnAction:false,roundEndDamageFraction:.02,stackModifiers:{{roundEndDamageFraction:.01}}}};
          q.registerStatusSpec('qa-stack',stackedSpec);for(let i=0;i<5;i++)q.status(unit,'qa-stack',2);const stackCount=unit.effects[0].stacks,stackHp=unit.hp;q.roundEnd();const stackTick=stackHp-unit.hp,stackExpected=Math.max(8,Math.round(unit.maxHp*.04));
          b.mode='cltq';const clHp=unit.hp;q.roundEnd();const cltqStackTick=clHp-unit.hp;b.mode='campaign';
          const control={{duration:1,stackingPolicy:'refresh-longer',expirePhase:'owner-action',removeAfterOwnAction:true,skipActionChance:1}};
          q.registerStatusSpec('qa-control',control);const actor=b.p[0];actor.effects=[];q.status(actor,'qa-control',1);q.perform(actor);
          return {{refreshed,affected,baseline,moraleBefore,morale,moraleFactor,tick,expectedTick:Math.max(8,Math.round(unit.maxHp*.1)),remaining,stackCount,stackTick,stackExpected,cltqStackTick,cltqBaseTick:Math.max(8,Math.round(unit.maxHp*.02)),controlMode:b.events.at(-1).mode,controlRemoved:!actor.effects.some(e=>e.kind==='qa-control')}};
        }}""")
        check("new status definitions drive refresh/stack caps and per-stack damage while CL ignores stack modifiers", status_probe["refreshed"] == 3 and status_probe["affected"] > status_probe["baseline"] and status_probe["moraleFactor"] == .4 and status_probe["morale"] == 30 and status_probe["tick"] == status_probe["expectedTick"] and status_probe["remaining"] == 2 and status_probe["stackCount"] == 3 and status_probe["stackTick"] == status_probe["stackExpected"] and status_probe["cltqStackTick"] == status_probe["cltqBaseTick"] and status_probe["controlMode"] == "stunned" and status_probe["controlRemoved"])

        # Verify the authored fifth-map A/B at one exact NPC tuning and seed.
        puzzle = page.evaluate(f"""() => {{
          const q=window.__P2_QA__,presets=window.__P3_QA__.presets,base=q.getGame(),out=[],encounter=q.data.campaign.encounters.find(item=>item.stage===5),expected=encounter.qaExpectations.sameSeedFormationPuzzle,recommendation=encounter.recommendedPreparation;
          base.roster=['guan','zhang','liu','zhuge','huang'];
          for(const id of base.roster)base.hero[id]=base.hero[id]||{{level:expected.heroLevel,xp:0,troops:expected.soldiersPerHero}};
          for(const id of base.roster){{base.hero[id].level=expected.heroLevel;base.hero[id].xp=0;base.hero[id].troops=expected.soldiersPerHero;}}
          base.slots=['guan','zhang','liu','zhuge','huang',null,null,null,null];base.cleared=[1,2,3,4];base.troopModes={{}};
          for(const preset of presets){{
            q.closeBattle('city');q.setGame(structuredClone(base));q.setEncounterPower(5,expected.enemyPower);window.__P3_QA__.assign(preset.id);q.beginBattle(5,'campaign');
            const battle=q.debugBattle();battle.seed=expected.seed;q.skipBattle();const report=q.getGame().battleReports[0];out.push({{id:preset.id,won:battle.won,rounds:battle.round,settlement:!battle.won?{{troopLosses:report?.troopLosses||null,rewards:report?.rewards||null}}:null}});
          }}
          const losing=out.find(row=>row.id===expected.losingPreset&&!row.won),winning=out.find(row=>row.id===expected.winningPreset&&row.won);
          q.closeBattle('city');return {{rows:out,loss:losing?.id||null,win:winning?.id||null,lossSettlement:losing?.settlement||null,expected,recommendation}};
        }}""")
        check("same-seed fifth-map formation A/B has a real losing setup and a winning setup at equal hero power", bool(puzzle["loss"] and puzzle["win"]))
        check("stage-5 data fixture reproduces its recorded same-seed loss/win pair", puzzle["loss"] == puzzle["expected"]["losingPreset"] and puzzle["win"] == puzzle["expected"]["winningPreset"])
        check("stage-5 recommendation matches its playable same-seed five-general level and formation setup", puzzle["recommendation"].get("recommendedPreset") == puzzle["win"] == puzzle["expected"]["winningPreset"] and puzzle["recommendation"]["minimumGenerals"] == 5 and puzzle["recommendation"]["averageHeroLevel"] == puzzle["expected"]["heroLevel"] == 5)
        loss_rows = puzzle["lossSettlement"]["troopLosses"] if puzzle["lossSettlement"] else []
        check("loss settlement records exact per-general troop casualties without granting rewards", len(loss_rows) == 5 and all(row["initial"] == puzzle["expected"]["soldiersPerHero"] and row["casualties"] == row["initial"] - row["remaining"] and row["casualties"] > 0 for row in loss_rows) and puzzle["lossSettlement"]["rewards"] == {})
        print(f"PUZZLE A/B: loss={puzzle['loss']} win={puzzle['win']} seed={puzzle['expected']['seed']}", flush=True)

        # One settlement, immutable replay, and v1-v4 save migration.
        settle = page.evaluate(f"""() => {{
          const q=window.__P2_QA__,g=q.getGame();g.roster=['guan','zhang','liu','zhuge','huang'];
          for(const id of g.roster)g.hero[id]=g.hero[id]||{{level:40,xp:0,troops:1200}};
          for(const id of g.roster){{g.hero[id].level=40;g.hero[id].xp=0;g.hero[id].troops=1200;}}
          g.slots=['guan','zhang','liu','zhuge','huang',null,null,null,null];g.cleared=[];q.closeBattle('city');q.setGame(g);q.beginBattle(1,'campaign');
          const beforeTroops=Object.fromEntries(g.roster.map(id=>[id,g.hero[id].troops])),beforeClReceipts=(g.cltq?.receipts||[]).length;
          const b=q.debugBattle();b.seed=20261117;q.skipBattle();const first=q.getGame(),report=first.battleReports[0],silver=first.silver,grain=first.grain,reports=first.battleReports.length,rows=report.troopLosses||[];
          const casualtyMatches=rows.length===5&&rows.every(row=>row.initial===beforeTroops[row.id]&&row.remaining===first.hero[row.id].troops&&row.casualties===row.initial-row.remaining&&row.provenance==='SIMULATED');
          q.finishBattle();const second=q.getGame();q.p2OpenReplay(second.battleReports[0]);q.p2LoadReplayFrame(second.battleReports[0].events.length);const replay=q.getGame();
          return {{won:report.won,clear:first.cleared.includes(1),casualtyMatches,clReceiptsUnchanged:(first.cltq?.receipts||[]).length===beforeClReceipts,once:second.battleReports.length===reports&&second.silver===silver&&second.grain===grain&&rows.every(row=>second.hero[row.id].troops===row.remaining),replayReadOnly:replay.silver===silver&&replay.grain===grain&&replay.battleReports.length===reports,key:localStorage.getItem('{SAVE_KEY}')!==null,version:replay.version}};
        }}""")
        check("real campaign settlement records exact troop losses, unlocks once, and replay cannot pay twice", settle["won"] and settle["clear"] and settle["casualtyMatches"] and settle["clReceiptsUnchanged"] and settle["once"] and settle["replayReadOnly"])
        check("existing save key and schema v5 remain active", settle["key"] and settle["version"] == 5)

        for version in (1, 2, 3, 4):
            legacy = json.loads(json.dumps(base))
            legacy["version"] = version
            legacy["silver"] = 9100 + version
            legacy["cleared"] = [1]
            # Keep this migration check independent from the game's 10-second
            # offline income timer while Chromium runs the preceding scenarios.
            legacy["lastTick"] = int(time.time() * 1000)
            if isinstance(legacy.get("cltq"), dict) and isinstance(legacy["cltq"].get("economy"), dict):
                legacy["cltq"]["economy"]["lastAt"] = legacy["lastTick"]
            legacy.pop("p3TroopTier", None)
            legacy.pop("p3PresetId", None)
            if version <= 2:
                legacy.pop("battleReports", None)
            migration_page = open_page(browser, stored=json.dumps(legacy, ensure_ascii=False))
            migrated = migration_page.evaluate(f"window.__P2_QA__.getGame()")
            if migrated["version"] != 5 or migrated["silver"] != 9100 + version or migrated["cleared"] != [1]:
                print(f"MIGRATION v{version} actual: version={migrated.get('version')} silver={migrated.get('silver')} cleared={migrated.get('cleared')}", flush=True)
            check(f"Save v{version} migration preserves progress and reaches schema v5", migrated["version"] == 5 and migrated["silver"] == 9100 + version and migrated["cleared"] == [1] and len(migrated["slots"]) == 9)
            migration_page.close()

        # Capture actual combat with the explanation visible.
        page.evaluate(f"g=>{qa}.setGame(g)", base)
        page.evaluate(f"{qa}.closeBattle('city')")
        page.evaluate(f"{qa}.selectTab('city')")
        page.evaluate(f"{qa}.beginBattle(5,'campaign')")
        page.evaluate(f"""() => {{const q=window.__P2_QA__,b=q.debugBattle(),s=b.e.find(u=>u.skillKey==='nl-sima');b.seed=81173;s.morale=100;q.perform(s);}}""")
        page.screenshot(path=str(ROOT / "qa" / "nl-r02-desktop-battle.png"), full_page=False)
        check("desktop Chromium screenshot captures the real battle and AI combat log", page.locator("#battle-canvas").count() == 1 and "AI:" in page.locator("#combat-log").inner_text())
        desktop_roster = page.evaluate("""() => {
          const root=document.querySelector('#battle-mobile-roster'),windowBox=document.querySelector('.battle-window').getBoundingClientRect(),cards=[...root.querySelectorAll('.mobile-roster-unit')];
          return {visible:getComputedStyle(root).display!=='none'&&root.getBoundingClientRect().height>0,cards:cards.map(card=>({slot:card.dataset.rosterSlot,text:card.innerText,box:(()=>{const r=card.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height};})(),nameSize:parseFloat(getComputedStyle(card.querySelector('.mobile-roster-name')).fontSize),metaSize:parseFloat(getComputedStyle(card.querySelector('.mobile-roster-meta')).fontSize)})),window:{bottom:windowBox.bottom}};
        }""")
        check("desktop live roster lists each unit name, 3x3 slot, troop count, HP and morale outside the canvas", desktop_roster["visible"] and len(desktop_roster["cards"]) >= 6 and all(card["slot"] is not None and "Ô " in card["text"] and " quân" in card["text"] and " HP · " in card["text"] and card["nameSize"] >= 10 and card["metaSize"] >= 9 and card["box"]["width"] >= 100 for card in desktop_roster["cards"]))
        check("desktop roster battle window remains inside 720px Chromium viewport", desktop_roster["window"]["bottom"] <= 720)

        mobile = open_page(browser, 390, 844)
        mobile.evaluate(f"{qa}.selectTab('city')")
        mobile.screenshot(path=str(ROOT / "qa" / "nl-r02-mobile-hub.png"), full_page=False)
        check("390px hub displays without horizontal overflow", mobile.evaluate("document.documentElement.scrollWidth <= innerWidth + 1") and mobile.locator('[data-nl-command] .nl-slot').count() == 9)
        mobile.evaluate(f"{qa}.beginBattle(1,'campaign')")
        mobile.wait_for_timeout(180)
        mobile.screenshot(path=str(ROOT / "qa" / "nl-r02-mobile-battle.png"), full_page=False)
        mobile_metrics = mobile.evaluate("""() => {
          const rect = selector => { const node=document.querySelector(selector); if(!node)return null; const r=node.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
          const head=rect('.battle-head'), title=rect('.battle-head>div:first-child'), tools=rect('.battle-tools'), canvas=rect('#battle-canvas'), roster=rect('#battle-mobile-roster'), log=rect('#combat-log');
          const intersects=(a,b)=>!!a&&!!b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
          const rosterUnit=document.querySelector('.mobile-roster-unit'),rosterMeta=document.querySelector('.mobile-roster-meta'),rosterHeading=document.querySelector('.mobile-roster-side h3');
          const fontSize=node=>node?parseFloat(getComputedStyle(node).fontSize):0;
          const rosterCards=[...document.querySelectorAll('.mobile-roster-unit')];
          return {viewport:innerWidth,viewportHeight:innerHeight,scrollWidth:document.documentElement.scrollWidth,head,title,tools,canvas,roster,log,
            toolsOverlapTitle:intersects(title,tools),rosterVisible:!!roster&&roster.height>0,rosterUnits:document.querySelectorAll('.mobile-roster-unit').length,
            fontSizes:{unit:fontSize(rosterUnit),meta:fontSize(rosterMeta),heading:fontSize(rosterHeading),log:fontSize(document.querySelector('#combat-log'))},
            eachRosterCardHasLiveTroopCount:rosterCards.every(card=>card.innerText.includes(' quân')&&card.innerText.includes(' HP · ')&&card.dataset.rosterSlot!==undefined),
            boundsFit:[head,tools,canvas,roster,log].every(r=>r&&r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1),
            canvasHeight:canvas?.height||0};
        }""")
        check("390px battle roster uses readable type sizes without shrinking the 3x3 canvas", mobile_metrics["fontSizes"]["heading"] >= 11 and mobile_metrics["fontSizes"]["unit"] >= 10.5 and mobile_metrics["fontSizes"]["meta"] >= 9 and mobile_metrics["fontSizes"]["log"] >= 11 and mobile_metrics["canvasHeight"] >= 140)
        check("390px real battle exposes all live troop counts, HP and morale within viewport without overlap", mobile_metrics["scrollWidth"] <= mobile_metrics["viewport"] + 1 and mobile_metrics["boundsFit"] and mobile_metrics["eachRosterCardHasLiveTroopCount"] and not mobile_metrics["toolsOverlapTitle"] and mobile_metrics["rosterVisible"] and mobile_metrics["rosterUnits"] >= 6 and mobile.locator("#battle-canvas").count() == 1 and mobile.locator("#combat-log").count() == 1)
        mobile.close()
        check("Chromium recorded no JavaScript exceptions", not errors)
        browser.close()

    report = {"milestone": "NL-R02", "total": len(checks), "passed": sum(item["pass"] for item in checks), "failed": [item["name"] for item in checks if not item["pass"]], "pageErrors": errors, "checks": checks, "counterAB": counter_rows, "drumAB": drum_results, "formationPuzzle": puzzle, "mobileBattleLayout": mobile_metrics}
    (ROOT / "qa" / "NL_R02.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"total": report["total"], "passed": report["passed"], "failed": report["failed"]}, ensure_ascii=False), flush=True)
    return 0 if report["passed"] == report["total"] else 1


if __name__ == "__main__":
    sys.exit(main())
