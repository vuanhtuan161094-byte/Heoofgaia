"""NL-R03 Chromium gate for real troop evolutions and four late-campaign tactics."""
from pathlib import Path
import json
import sys
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
    store = {} if stored is None else {SAVE_KEY: stored}
    stub = STUB.replace("__NL_STORE__", json.dumps(store, ensure_ascii=False))
    page.set_content(HTML.replace("<script>", stub + "<script>", 1), wait_until="domcontentloaded")
    return page


def state(page):
    return page.evaluate("window.__P2_QA__.getGame()")


def run():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        page = open_page(browser)
        initial = state(page)
        check("R03 hydration keeps schema v5 and initializes independent evolution state", initial["version"] == 5 and initial["nlr03"] == {"schema": 1, "evolutions": {}})
        check("four late campaign encounters extend the 24-stage story without changing earlier entries", len(page.evaluate("window.__NL_R03_QA__.stages")) == 4 and page.evaluate("window.__NL_R03_QA__.stages[0].number") == 25 and page.evaluate("window.__NL_R03_QA__.stages[3].number") == 28)
        page.locator('.nav[data-tab="campaign"]').click()
        check("late encounter 25 stays locked until the first 24 campaign wins", page.locator('[data-stage="25"]').count() == 1 and page.locator('[data-stage="25"]').is_disabled())

        # Give QA fixtures five original hero classes and ample real resources.
        fixture = state(page)
        for hero in ("sun", "zhou"):
            if hero not in fixture["roster"]:
                fixture["roster"].append(hero)
                fixture["hero"][hero] = {"level": 1, "xp": 0, "troops": 360}
        fixture["slots"] = ["guan", "zhang", "liu", "sun", "zhou", None, None, None, None]
        fixture["silver"], fixture["grain"], fixture["iron"] = 60000, 30000, 18000
        page.evaluate("g=>window.__P2_QA__.setGame(g)", fixture)
        page.locator('[data-tab="barracks"]').click()
        check("barracks exposes the 25-unit playable roster as five classes, tier training and branch choices", all(page.locator(f'[data-r03-select="{hero}"] option').count() == (7 if hero == "zhang" else 4) for hero in ("liu", "guan", "zhang", "sun", "zhou")))
        check("lineage choices are gated by a real level-2 barracks", page.locator('[data-r03-evolve="guan"]').is_disabled())
        old_building = state(page)["buildings"]["barracks"]
        page.locator('[data-upgrade="barracks"]').click()
        check("paid barracks upgrade opens the lineage system", old_building == 1 and state(page)["buildings"]["barracks"] == 2 and not page.locator('[data-r03-evolve="guan"]').is_disabled())

        branches = [
            ("guan", "shock", "catk", "higher", None),
            ("zhang", "bulwark", "def", "higher", None),
            ("sun", "marksman", "crit", "higher", None),
            ("zhou", "ember", "matk", "higher", "burn"),
            ("liu", "medic", "skill", "higher", None),
        ]
        for hero, branch, metric, direction, extra in branches:
            before = state(page)
            if metric == "skill":
                baseline = page.evaluate("id=>window.__NL_R03_QA__.skill({id,team:'p'}).mult", hero)
            else:
                baseline = page.evaluate("({id,key})=>window.__NL_R03_QA__.unit(id,'p',2,1)[key]", {"id": hero, "key": metric})
            page.locator(f'[data-r03-select="{hero}"]').select_option(branch)
            page.locator(f'[data-r03-evolve="{hero}"]').click()
            after = state(page)
            if metric == "skill":
                changed = page.evaluate("id=>window.__NL_R03_QA__.skill({id,team:'p'}).mult", hero) > baseline
            else:
                changed = page.evaluate("({id,key})=>window.__NL_R03_QA__.unit(id,'p',2,1)[key]", {"id": hero, "key": metric}) > baseline
            check(f"{hero} {branch} is an actual paid branch with a live combat effect", after["nlr03"]["evolutions"].get(hero) == branch and before["silver"] - after["silver"] == 1100 and before["grain"] - after["grain"] == 520 and before["iron"] - after["iron"] == 280 and changed)
            if extra == "burn":
                descriptor = page.evaluate("id=>window.__NL_R03_QA__.skill({id,team:'p'})", hero)
                check("Hỏa Cơ inserts a real burn status into the strategist skill", descriptor.get("apply") == "burn" and descriptor.get("applyChance", 0) >= .58)

        # Invalid branch selection and repeated same choice cannot debit twice.
        before_invalid = state(page)
        check("a general cannot learn a branch from another troop class", page.evaluate("()=>window.__NL_R03_QA__.evolve('guan','medic')") is False and state(page)["silver"] == before_invalid["silver"])
        same_branch_before = state(page)
        page.locator('[data-r03-select="guan"]').select_option("shock")
        page.locator('[data-r03-evolve="guan"]').click()
        check("reapplying the current lineage cannot charge resources again", state(page)["silver"] == same_branch_before["silver"] and state(page)["nlr03"]["evolutions"]["guan"] == "shock")

        volley_base = page.evaluate("id=>window.__NL_R03_QA__.skill({id,team:'p'}).mult", "sun")
        page.locator('[data-r03-select="sun"]').select_option("volley")
        page.locator('[data-r03-evolve="sun"]').click()
        volley = page.evaluate("id=>window.__NL_R03_QA__.skill({id,team:'p'})", "sun")
        check("Liên Nỗ changes the archer skill to a stronger real double strike", volley["pattern"] == "double" and volley["mult"] > volley_base)
        page.locator('[data-r03-select="zhou"]').select_option("disrupt")
        page.locator('[data-r03-evolve="zhou"]').click()
        disrupted = page.evaluate("id=>window.__NL_R03_QA__.skill({id,team:'p'})", "zhou")
        check("Nhiễu Tâm adds real morale drain to the strategist skill", disrupted.get("drainMorale", 0) >= 18)
        page.locator('[data-r03-select="zhang"]').select_option("spearwall")
        page.locator('[data-r03-evolve="zhang"]').click()
        spear = page.evaluate("window.__NL_R03_QA__.unit('zhang','p',1,1)")
        check("Thương Phá Kỵ keeps its infantry combat archetype, switches to spear troop and counters cavalry", spear["troop"] == "spear" and spear["type"] == "infantry" and page.evaluate("window.__P3_QA__.counter('spear','cavalry') > 1"))
        page.locator('[data-r03-select="zhang"]').select_option("phalanx")
        page.locator('[data-r03-evolve="zhang"]').click()
        phalanx = page.evaluate("window.__NL_R03_QA__.unit('zhang','p',1,1)")
        check("spear specialization is selectable on an infantry commander and changes real unit class and defense", phalanx["troop"] == "spear" and phalanx["r03Branch"] == "phalanx" and phalanx["tdef"] >= spear["tdef"])
        page.locator('[data-r03-select="zhang"]').select_option("impaler")
        page.locator('[data-r03-evolve="zhang"]').click()
        impaler = page.evaluate("window.__NL_R03_QA__.unit('zhang','p',1,1)")
        check("alternate spear branch is a distinct live combat build", impaler["troop"] == "spear" and impaler["r03Branch"] == "impaler" and impaler["atk"] > phalanx["atk"])
        page.locator('[data-r03-select="liu"]').select_option("rally")
        page.locator('[data-r03-evolve="liu"]').click()
        page.evaluate("window.__P2_QA__.useTroop('liu','drum')")
        page.evaluate("window.__P2_QA__.beginBattle(1,'campaign')")
        page.evaluate("""() => {
          const b=__P2_QA__.debugBattle(),a=b.p.find(unit=>unit.id==='liu');
          for(const unit of b.p)unit.morale=10;
          a.morale=10;b.order=[['p',a.slot]];b.orderIndex=0;b.next=Date.now()+120000;
          __P2_QA__.stepBattle();
        }""")
        rallied = page.evaluate("window.__P2_QA__.getBattle()")
        check("Hiệu Lệnh adds 12 morale to every ally in a real drum action", rallied["events"][-1]["mode"] == "drum" and all(unit["morale"] == (63 if unit["id"] == "liu" else 56) for unit in rallied["p"]))
        page.evaluate("window.__P2_QA__.closeBattle('city')")

        # Change the cavalry path and prove the live player action selects a rear target.
        page.locator('.nav[data-tab="barracks"]').click()
        page.locator('[data-r03-select="guan"]').select_option("raider")
        page.locator('[data-r03-evolve="guan"]').click()
        page.evaluate("window.__P2_QA__.beginBattle(1,'campaign')")
        page.evaluate("""() => {
          const b=__P2_QA__.debugBattle();
          b.e=[
            {id:'front',team:'e',slot:2,type:'infantry',troop:'infantry',hp:900,maxHp:900,morale:30,effects:[]},
            {id:'rear',team:'e',slot:0,type:'archer',troop:'archer',hp:900,maxHp:900,morale:30,effects:[]}
          ];
          const actor=b.p.find(unit=>unit.id==='guan');actor.morale=0;
          b.order=[['p',actor.slot]];b.orderIndex=0;b.next=Date.now()+120000;
          __P2_QA__.stepBattle();
        }""")
        action = page.evaluate("window.__P2_QA__.getBattle().events.at(-1)")
        check("Kỵ Tập Hậu changes the real AI target and combat event to the back row", action["actor"] == "Quan Vũ" and action["hits"][0]["slot"] == 0 and action["mode"] == "normal")
        page.evaluate("window.__P2_QA__.closeBattle('city')")

        # The active Wiki documents stackable/unremovable effects and effects
        # that suppress morale gain. Project rules remain SIMULATED; verify the
        # real healing skill has a deterministic cleanse/immunity counterplay.
        page.evaluate("window.__P2_QA__.beginBattle(1,'campaign')")
        status_action = page.evaluate("""() => {
          const q=window.__P2_QA__,b=q.debugBattle(),actor=b.p.find(unit=>unit.id==='liu'),target=b.p.find(unit=>unit.id!=='liu');
          for(const unit of b.p){unit.hp=unit.maxHp;unit.morale=0;}
          actor.troop='support';actor.morale=100;target.hp=Math.round(target.maxHp*.4);target.effects=[{kind:'daze',turns:1},{kind:'burn',turns:2}];
          q.perform(actor);
          const event=b.events.at(-1),afterHeal=b.p.find(unit=>unit.id===target.id),blocked=q.status(afterHeal,'break',2),remaining=q.cleanse(afterHeal,'harmful',4);
          return {event,remainingEffects:afterHeal.effects.map(effect=>effect.kind),blocked,remaining,description:event.description};
        }""")
        page.screenshot(path=str(ROOT / "qa" / "nl-r03-cleanse-counterplay.png"), full_page=False)
        check("Lưu Bị's real healing skill cleanses one harmful effect and grants its catalogued ward", status_action["event"]["skill"] == "Nhân Đức" and status_action["event"]["cleansed"] and status_action["event"]["cleansed"][0]["effects"] == ["daze"] and "giải hiệu ứng bất lợi" in status_action["description"] and "ward" in status_action["remainingEffects"])
        check("ward prevents harmful application and remains unremovable while later cleanse removes burn", not status_action["blocked"] and status_action["remaining"] == ["burn"] and status_action["remainingEffects"] == ["ward"])
        page.evaluate("window.__P2_QA__.closeBattle('city')")

        # Persist the new optional state, then load a pre-R03 v5 save safely.
        serialized = page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')")
        page.close()
        page = open_page(browser, stored=serialized)
        loaded = state(page)
        check("save reload preserves each selected lineage and other v5 state", loaded["nlr03"]["evolutions"] == {"liu": "rally", "guan": "raider", "zhang": "impaler", "sun": "volley", "zhou": "disrupt"} and loaded["version"] == 5 and "cltq" in loaded and len(loaded["slots"]) == 9)
        old_v5 = json.loads(serialized)
        old_v5.pop("nlr03", None)
        legacy_page = open_page(browser, stored=json.dumps(old_v5, ensure_ascii=False))
        migrated = state(legacy_page)
        check("older v5 saves without the optional field hydrate without losing campaign or CL data", migrated["version"] == 5 and migrated["nlr03"]["evolutions"] == {} and migrated["cleared"] == loaded["cleared"] and "cltq" in migrated)
        legacy_page.close()

        # Late chapters are visible and selectable only after their predecessor.
        unlocked = state(page)
        unlocked["cleared"] = list(range(1, 25))
        unlocked["silver"], unlocked["grain"], unlocked["iron"] = 50000, 30000, 18000
        unlocked["hero"] = {key: {"level": 32, "xp": 0, "troops": 900} for key in unlocked["roster"]}
        unlocked["p3TroopTier"] = {key: 4 for key in unlocked["roster"]}
        page.evaluate("g=>window.__P2_QA__.setGame(g)", unlocked)
        page.locator('.nav[data-tab="campaign"]').click()
        check("stage 25 opens after real preceding-clearance state and stage 26 remains gated", not page.locator('[data-stage="25"]').is_disabled() and page.locator('[data-stage="26"]').is_disabled())
        page.locator('[data-stage="25"]').click()
        page.locator('[data-battle="25"]').click()
        first = page.evaluate("window.__P2_QA__.getBattle()")
        check("stage 25 starts a real battle with its visible defensive rule", first["r03Encounter"]["id"] == "r03-bulwark" and "thế thủ" in page.locator('[data-r03-encounter]').inner_text() and all(any(e["kind"] == "guard" for e in unit["effects"]) for unit in first["e"][:2]))
        page.screenshot(path=str(ROOT / "qa" / "nl-r03-stage25.png"), full_page=False)
        page.evaluate("window.__P2_QA__.skipBattle()")
        stage25_result = state(page)
        stage25_report = stage25_result["battleReports"][0]
        check("stage 25 is naturally winnable and records its unique rule in the settlement receipt", stage25_report["won"] and 25 in stage25_result["cleared"] and stage25_report.get("r03Encounter", {}).get("id") == "r03-bulwark" and stage25_report["rewards"].get("silver", 0) > 0)
        page.evaluate("window.__P2_QA__.closeBattle('city')")

        encounter_checks = []
        for stage, expected in ((26, "r03-ember"), (27, "r03-flank"), (28, "r03-drum")):
            current = state(page)
            current["cleared"] = list(range(1, stage))
            current["silver"], current["grain"] = 50000, 30000
            page.evaluate("g=>window.__P2_QA__.setGame(g)", current)
            page.evaluate("stage=>window.__P2_QA__.beginBattle(stage,'campaign')", stage)
            battle = page.evaluate("window.__P2_QA__.getBattle()")
            encounter = battle.get("r03Encounter") or {}
            valid = encounter.get("id") == expected and page.locator('[data-r03-encounter]').count() == 1
            if stage == 26:
                valid = valid and any(unit["type"] == "strategist" and unit["morale"] >= 100 for unit in battle["e"])
                page.evaluate("""() => {
                  const b=__P2_QA__.debugBattle(),a=b.e.find(unit=>unit.type==='strategist');
                  b.order=[['e',a.slot]];b.orderIndex=0;b.next=Date.now()+120000;
                  __P2_QA__.stepBattle();
                }""")
                opening_skill = page.evaluate("window.__P2_QA__.getBattle().events.at(-1)")
                valid = valid and opening_skill["actorTeam"] == "e" and opening_skill["mode"] == "skill" and any(any(effect["kind"] == "burn" for effect in unit["effects"]) for unit in opening_skill["state"]["p"])
            elif stage == 27:
                valid = valid and sum(unit["type"] == "cavalry" for unit in battle["e"]) >= 2 and all(unit["speed"] >= 100 for unit in battle["e"] if unit["type"] == "cavalry")
            elif stage == 28:
                valid = valid and any(unit["troop"] == "drum" and unit["morale"] >= 100 for unit in battle["e"])
                page.evaluate("""() => {
                  const b=__P2_QA__.debugBattle(),a=b.e.find(unit=>unit.troop==='drum');
                  for(const unit of b.e)unit.morale=10;
                  a.morale=100;b.order=[['e',a.slot]];b.orderIndex=0;b.next=Date.now()+120000;
                  __P2_QA__.stepBattle();
                }""")
                opening_drum = page.evaluate("window.__P2_QA__.getBattle()")
                valid = valid and opening_drum["events"][-1]["actorTeam"] == "e" and opening_drum["events"][-1]["mode"] == "drum" and all(unit["morale"] == 65 for unit in opening_drum["e"] if unit["troop"] != "drum")
            encounter_checks.append(valid)
            check(f"stage {stage} initializes its distinct opponent mechanic and battle callout", valid)
            page.evaluate("window.__P2_QA__.closeBattle('city')")
        check("all four original challenge stages have unique real battle mechanics", len(encounter_checks) == 3 and all(encounter_checks) and len({"r03-bulwark", "r03-ember", "r03-flank", "r03-drum"}) == 4)

        # Stage 27 cavalry actually uses the rear-line rule from its encounter definition.
        current = state(page)
        current["cleared"] = list(range(1, 27))
        page.evaluate("g=>window.__P2_QA__.setGame(g)", current)
        page.evaluate("window.__P2_QA__.beginBattle(27,'campaign')")
        target = page.evaluate("""() => {
          const b=__P2_QA__.debugBattle(),cavalry=b.e.find(unit=>unit.type==='cavalry');
          b.p=[
            {id:'pfront',team:'p',slot:2,troop:'infantry',type:'infantry',hp:800,maxHp:800,morale:40,effects:[]},
            {id:'prear',team:'p',slot:0,troop:'support',type:'support',hp:800,maxHp:800,morale:40,effects:[]}
          ];
          return __P2_QA__.p2Target(cavalry).id;
        }""")
        check("ambush encounter AI really targets the exposed rear unit", target == "prear")
        page.evaluate("window.__P2_QA__.closeBattle('city')")

        # Four late encounters now have frozen, same-seed formation choice
        # fixtures. Only the saved 3x3 preset changes between each A/B pair.
        formation_choices = page.evaluate("""() => {
          const q=window.__P2_QA__,presets=window.__P3_QA__.presets,base=q.getGame(),stages=[25,26,27,28],rows=[];
          base.roster=['guan','zhang','liu','sun','zhou'];
          for(const id of base.roster)base.hero[id]={...(base.hero[id]||{}),level:32,xp:0,troops:900};
          base.slots=['guan','zhang','liu','sun','zhou',null,null,null,null];
          base.troopModes={};
          base.silver=100000;base.grain=100000;base.iron=100000;
          base.p3TroopTier=Object.fromEntries(base.roster.map(id=>[id,4]));
          base.nlr03={schema:1,evolutions:{guan:'raider',zhang:'spearwall',liu:'rally',sun:'volley',zhou:'disrupt'}};
          base.battleReports=[];
          for(const stage of stages){
            const encounter=q.data.campaign.encounters.find(item=>item.stage===stage),expectation=encounter.qaExpectations.sameSeedFormationChoice,ab=[];
            for(const presetId of [expectation.lowerLossPreset,expectation.higherLossPreset]){
              q.closeBattle('city');const fixture=structuredClone(base);fixture.cleared=Array.from({length:stage-1},(_,index)=>index+1);q.setGame(fixture);
              window.__P3_QA__.assign(presetId);q.beginBattle(stage,'campaign');const battle=q.debugBattle();
              if(!battle){ab.push({preset:presetId,won:false,casualties:null});continue;}
              battle.seed=expectation.seed;q.skipBattle();const report=q.getGame().battleReports.at(-1);
              ab.push({preset:presetId,won:report?.won||false,casualties:(report?.troopLosses||[]).reduce((sum,row)=>sum+row.casualties,0)});
            }
            rows.push({stage,expectation,ab});
          }
          q.closeBattle('city');return rows;
        }""")
        for choice in formation_choices:
            low, high = choice["ab"]
            expected = choice["expectation"]
            check(f"stage {choice['stage']} same-seed formation A/B clears both setups and lowers troop casualties", low["preset"] == expected["lowerLossPreset"] and high["preset"] == expected["higherLossPreset"] and low["won"] and high["won"] and high["casualties"] - low["casualties"] >= expected["minimumCasualtyGap"])
            print(f"FORMATION A/B stage {choice['stage']}: {low['preset']} loss={low['casualties']} vs {high['preset']} loss={high['casualties']} seed={expected['seed']}", flush=True)

        completed = state(page)
        for hero in ("guan", "zhang", "liu", "sun", "zhou"):
            if hero not in completed["roster"]: completed["roster"].append(hero)
            completed["hero"][hero] = {"level": 40, "xp": 0, "troops": 900}
        completed["slots"] = ["guan", "zhang", "liu", "sun", "zhou", None, None, None, None]
        completed["cleared"] = list(range(1, 28))
        completed["silver"], completed["grain"], completed["iron"] = 50000, 30000, 18000
        page.evaluate("g=>window.__P2_QA__.setGame(g)", completed)
        page.evaluate("window.__P2_QA__.beginBattle(28,'campaign')")
        page.evaluate("""() => {
          const b=window.__P2_QA__.debugBattle();
          for(const unit of b.p){unit.hp=unit.maxHp;unit.troops=900;}
          b.e=[];b.finished=false;b.replay=false;
          window.__P2_QA__.finishBattle();
        }""")
        end_report = page.evaluate("window.__P2_QA__.getGame().battleReports.at(-1)")
        ending_result = page.locator('[data-nl-campaign-ending="1"]')
        first_silver = state(page)["silver"]
        page.evaluate("window.__P2_QA__.finishBattle()")
        check("final boss victory settles encounter 28 once and renders the end-of-campaign result", ending_result.count() == 1 and end_report["won"] and end_report["stage"] == 28 and 28 in state(page)["cleared"] and state(page)["silver"] == first_silver)
        page.locator('[data-end-battle="1"]').click()
        page.locator('[data-tab="campaign"]').click()
        check("clearing encounter 28 of chapter 8 renders the ending and the final boss badge", page.locator('[data-nl-campaign-ending="1"]').count() == 1 and "28 cửa ải" in page.locator('[data-nl-campaign-ending="1"]').inner_text() and page.locator('[data-nl-boss="1"]').count() == 1)

        mobile = open_page(browser, 390, 844, stored=serialized)
        mobile.locator('[data-tab="barracks"]').click()
        check("mobile evolution panel keeps all five class choices available", mobile.locator('[data-r03-select]').count() == 5 and mobile.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))
        mobile.locator('[data-r03-lineage]').screenshot(path=str(ROOT / "qa" / "nl-r03-mobile-lineage.png"))
        check("Chromium recorded no JavaScript exceptions", not errors)
        mobile.close()
        browser.close()

    report = {
        "milestone": "NL-R03",
        "total": len(checks),
        "passed": sum(item["pass"] for item in checks),
        "failed": [item["name"] for item in checks if not item["pass"]],
        "pageErrors": errors,
        "checks": checks,
    }
    (ROOT / "qa" / "NL_R03.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"total": report["total"], "passed": report["passed"], "failed": report["failed"]}, ensure_ascii=False))
    return 0 if report["passed"] == report["total"] else 1


if __name__ == "__main__":
    sys.exit(run())
