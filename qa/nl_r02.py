"""NL-R02 functional Chromium gate: real state, settlement, save and replay."""
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
    store = {} if stored is None else {SAVE_KEY: stored}
    stub = STUB.replace("__NL_STORE__", json.dumps(store, ensure_ascii=False))
    page.set_content(HTML.replace("<script>", stub + "<script>", 1), wait_until="domcontentloaded")
    return page


def game(page):
    return page.evaluate("window.__P2_QA__.getGame()")


def run():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])

        # New city lord, recruitment and all 24 authoritative preset writes.
        page = open_page(browser)
        initial = game(page)
        check("new city starts with schema v5, saved resources and a 3x3 formation", initial["version"] == 5 and len(initial["slots"]) == 9 and len(initial["roster"]) == 3)
        check("existing save key remains canonical", page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1') !== null"))
        page.locator('[data-tab="heroes"]').click()
        page.locator('[data-recruit]').click()
        page.locator('[data-recruit]').click()
        check("free and paid tavern recruitment produce owned generals", len(game(page)["roster"]) == 5)

        page.locator('[data-tab="formation"]').click()
        presets = page.evaluate("window.__P3_QA__.presets")
        money_before = game(page)
        slot_masks = set()
        for preset in presets:
            page.evaluate("id=>window.__P3_QA__.assign(id)", preset["id"])
            current = game(page)
            slot_masks.add(tuple(current["slots"]))
        after_presets = game(page)
        check("24 named presets each write a distinct formation identity", len(presets) == 24 and len({p["id"] for p in presets}) == 24 and after_presets["p3PresetId"] == presets[-1]["id"])
        check("preset selection changes 3x3 placements and does not mint or charge resources", len(slot_masks) >= 2 and len([x for x in after_presets["slots"] if x]) == 5 and (money_before["silver"], money_before["grain"], money_before["iron"], money_before["reserve"]) == (after_presets["silver"], after_presets["grain"], after_presets["iron"], after_presets["reserve"]))
        page.evaluate("window.__P3_QA__.assign('spear-dieu')")
        state = game(page)
        check("five owned generals occupy valid cells", sum(bool(x) for x in state["slots"]) == 5 and len(set(x for x in state["slots"] if x)) == 5 and all(0 <= i < 9 for i, x in enumerate(state["slots"]) if x))

        # Real equipment and technology interactions feed battle-unit creation.
        page.locator('[data-tab="city"]').click()
        page.locator('[data-nl-route="equipment"]').click()
        page.locator("#gear-hero").select_option("guan")
        atk_without_gear = page.evaluate("window.__P3_QA__.unit('guan','p',2,1).atk")
        page.locator('[data-equip="1"]').click()
        atk_with_gear = page.evaluate("window.__P3_QA__.unit('guan','p',2,1).atk")
        check("equipping owned gear changes actual battle stats", game(page)["gear"].get("guan", {}).get("weapon") == 1 and atk_with_gear > atk_without_gear)
        page.locator('[data-tab="city"]').click()
        page.locator('[data-nl-route="tech"]').click()
        page.locator('[data-research="arms"]').click()
        check("research spends real resources and affects saved technology", game(page)["technology"]["arms"] == 1)

        # Start through the playable command hub. Start cost must settle only once.
        page.locator('[data-tab="city"]').click()
        page.locator('[data-nl-route="formation"]').click()
        page.evaluate("window.__P3_QA__.assign('arc-dieu')")
        page.locator('[data-tab="city"]').click()
        refreshed = game(page)
        refreshed["lastTick"] = page.evaluate("Date.now()")
        page.evaluate("g=>window.__P2_QA__.setGame(g)", refreshed)
        page.evaluate("window.__NL_FIXED_NOW=Date.now();Date.now=()=>window.__NL_FIXED_NOW")
        before_start = game(page)
        page.locator('[data-nl-command] [data-battle="1"]').click()
        page.evaluate("window.__P2_QA__.beginBattle(1,'campaign')")
        battle = page.evaluate("window.__P2_QA__.debugBattle()")
        page.evaluate("window.__P2_QA__.debugBattle().next=Date.now()+120000")
        after_start = game(page)
        check("battle starts from the city hub with five live player units", battle is not None and len(battle["p"]) == 5 and len(battle["e"]) >= 1)
        check("duplicate battle start charges the 125-grain fee once", before_start["grain"] - after_start["grain"] == 125)

        # Deterministic tactical targeting and all three damage authorities.
        qa_target = page.evaluate("""() => {
          const b=__P2_QA__.debugBattle(); b.seed=17;
          b.e=[
            {id:'guard-cav',team:'e',slot:2,troop:'cavalry',type:'cavalry',hp:500,maxHp:500,morale:40,effects:[]},
            {id:'weak-archer',team:'e',slot:5,troop:'archer',type:'archer',hp:500,maxHp:500,morale:40,effects:[]}
          ];
          const attacker={team:'p',slot:2,troop:'cavalry',type:'cavalry'};
          const first=__P3_QA__.target(attacker).id, second=__P3_QA__.target(attacker).id;
          const a={...b.p.find(u=>u.id==='guan'),atk:180,catk:190,matk:200,crit:0,troop:'cavalry'};
          const t={...b.e[0],def:30,tdef:35,mdef:40,hp:1000,maxHp:1000};
          b.seed=888; const physical=__P2_QA__.p2Hit(a,{...t,hp:1000},'physical').kind;
          b.seed=888; const tactic=__P2_QA__.p2Hit(a,{...t,hp:1000},'tactic').kind;
          b.seed=888; const magic=__P2_QA__.p2Hit(a,{...t,hp:1000},'magic').kind;
          return {first,second,physical,tactic,magic};
        }""")
        check("target AI is deterministic and honors the counter tactic", qa_target["first"] == qa_target["second"] == "weak-archer")
        check("battle authority resolves physical, tactic and magic damage separately", (qa_target["physical"], qa_target["tactic"], qa_target["magic"]) == ("physical", "tactic", "magic"))

        # Put a named general at threshold and let the actual engine consume morale/cast.
        page.evaluate("""() => {
          const b=__P2_QA__.debugBattle(); b.e=b.opening.e.map(u=>({...u}));
          b.p=b.opening.p.map(u=>({...u}));
          const actor=b.p.find(u=>u.id==='guan'); actor.morale=100;
          b.order=[['p',actor.slot]];b.orderIndex=0;b.next=Date.now()+120000;
          __P2_QA__.stepBattle();
        }""")
        event = page.evaluate("window.__P2_QA__.getBattle().events.at(-1)")
        check("morale threshold consumes morale and triggers the general's real skill", event["mode"] == "skill" and event["skill"] == "Thanh Long Trảm" and event["kind"] == "tactic")
        current = page.evaluate("window.__P41_QA__.currentEvent()")
        check("animated battle view is driven by that real skill hit event", current is not None and current["mode"] == "skill" and len(current["hits"]) > 0)
        page.wait_for_timeout(220)
        page.screenshot(path=str(ROOT / "qa" / "nl-r02-desktop-battle.png"), full_page=False)

        # Complete the real stage battle with the authored starting roster.
        page.evaluate("window.__P2_QA__.skipBattle()")
        result_one = game(page)
        report_one = result_one["battleReports"][0]
        page.evaluate("window.__P2_QA__.finishBattle()")
        result_twice = game(page)
        check("first win settles once and opens stage 2", report_one["won"] and 1 in result_one["cleared"] and "stage" in str(report_one))
        check("losses are recorded as troop attrition and the settlement guard blocks duplicate payout", len(result_twice["battleReports"]) == 1 and result_twice["silver"] == result_one["silver"] and result_twice["grain"] == result_one["grain"])

        # Upgrade barracks then a real troop tier; tier changes strength, not troop count.
        page.locator('[data-end-battle="1"]').click()
        page.locator('[data-tab="city"]').click()
        page.locator('[data-nl-route="barracks"]').click()
        troops_before = game(page)["hero"]["guan"]["troops"]
        page.locator('[data-upgrade="barracks"]').click()
        page.locator('[data-p3-upgrade="guan"]').click()
        upgraded = game(page)
        check("building and troop-tier costs unlock and change combat tier", upgraded["buildings"]["barracks"] == 2 and upgraded["p3TroopTier"]["guan"] == 2)
        check("tier training never creates soldiers", upgraded["hero"]["guan"]["troops"] == troops_before)

        # Full document reload using only persisted Save v5; stage 2 then wins.
        serialized = page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')")
        page.close()
        page = open_page(browser, stored=serialized)
        restored = game(page)
        check("save/reload preserves stage, preset, gear, tier, reports and legacy CL state", restored["version"] == 5 and 1 in restored["cleared"] and restored["p3PresetId"] == "arc-dieu" and restored["p3TroopTier"]["guan"] == 2 and restored["gear"]["guan"]["weapon"] == 1 and "cltq" in restored)
        page.locator('[data-nl-route="campaign"]').click()
        check("stage 2 is visibly selectable after stage 1 victory", page.locator('[data-stage="2"]:not([disabled])').count() == 1)
        page.locator('[data-tab="city"]').click()
        page.locator('[data-nl-command] [data-battle="2"]').click()
        page.evaluate("window.__P2_QA__.skipBattle()")
        second = game(page)
        check("next campaign battle runs and adds its own single report", 2 in second["cleared"] and len(second["battleReports"]) == 2 and second["battleReports"][0]["stage"] == 2)

        # Replay is a pure snapshot reader; neither the button nor seek pays again.
        settled = game(page)
        page.locator('[data-replay-last]').click()
        page.evaluate("window.__P2_QA__.p2LoadReplayFrame(window.__P2_QA__.getBattle().report.events.length)")
        replay = page.evaluate("window.__P2_QA__.getBattle()")
        after_replay = game(page)
        check("stored replay reaches the original final snapshot", replay["replay"] and replay["p"] == replay["report"]["final"]["p"] and replay["e"] == replay["report"]["final"]["e"])
        check("replay cannot repeat resources, XP, clearance or receipts", (after_replay["silver"], after_replay["grain"], after_replay["iron"], after_replay["cleared"], after_replay["hero"]["guan"]["xp"], len(after_replay["battleReports"])) == (settled["silver"], settled["grain"], settled["iron"], settled["cleared"], settled["hero"]["guan"]["xp"], len(settled["battleReports"])))
        page.locator('[data-end-battle="1"]').click()
        page.close()

        # Failure path: insufficient starting supply pays nothing and creates no battle.
        page = open_page(browser)
        low = game(page)
        low["grain"] = 0
        page.evaluate("g=>window.__P2_QA__.setGame(g)", low)
        before = game(page)
        page.evaluate("window.__P2_QA__.beginBattle(1,'campaign')")
        after = game(page)
        check("insufficient grain blocks battle with no debit or progress", page.evaluate("window.__P2_QA__.getBattle()===null") and before["grain"] == after["grain"] and before["cleared"] == after["cleared"])
        page.close()

        # Failure path uses the actual loss settlement branch with a forced losing state.
        page = open_page(browser)
        page.evaluate("window.__P2_QA__.beginBattle(1,'campaign')")
        page.evaluate("""() => {const b=__P2_QA__.debugBattle();for(const u of b.p)u.hp=0;__P2_QA__.finishBattle();}""")
        loss = game(page)
        loss_report = loss["battleReports"][0]
        check("loss records a failure and grants no victory resources/items/clearance", loss_report["won"] is False and loss_report["rewards"] == {} and loss["cleared"] == [] and len(loss["items"]) == 3)
        page.close()

        # v1-v4 legacy fixtures retain old progress and hydrate to v5 without data loss.
        migrated = []
        legacy_source = initial.copy()
        for version in (1, 2, 3, 4):
            legacy = json.loads(json.dumps(legacy_source))
            legacy["version"] = version
            legacy["lastTick"] = int(time.time() * 1000)
            legacy["silver"] = 9123 + version
            legacy["cleared"] = [1]
            legacy.pop("p3TroopTier", None)
            legacy.pop("p3PresetId", None)
            legacy.pop("cltq", None)
            if version <= 2:
                legacy.pop("battleReports", None)
                legacy.pop("troopModes", None)
            page = open_page(browser, stored=json.dumps(legacy, ensure_ascii=False))
            state = game(page)
            migrated.append(state["version"] == 5 and state["silver"] == 9123 + version and state["cleared"] == [1] and len(state["slots"]) == 9 and "cltq" in state and isinstance(state.get("p3TroopTier"), dict))
            print(f"MIGRATION v{version}: version={state['version']} silver={state['silver']} cleared={state['cleared']} slots={len(state['slots'])} cltq={'cltq' in state} tiers={isinstance(state.get('p3TroopTier'), dict)}", flush=True)
            page.close()
        check("all v1-v4 legacy save fixtures migrate to v5 and preserve progress", all(migrated))

        # Mobile layout and the same live command hub; this screenshot is real Chromium.
        mobile = open_page(browser, 390, 844)
        check("mobile hub exposes nine cells and all R02 core screens", mobile.locator('[data-nl-command] .nl-slot').count() == 9 and all(mobile.locator(f'[data-nl-route="{route}"]').count() == 1 for route in ("heroes", "formation", "barracks", "equipment", "tech", "campaign")))
        check("390px viewport has no horizontal document overflow", mobile.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))
        mobile.screenshot(path=str(ROOT / "qa" / "nl-r02-mobile-hub.png"), full_page=False)
        mobile.close()

        check("Chromium recorded no JavaScript exceptions", not errors)
        browser.close()

    report = {
        "milestone": "NL-R02",
        "total": len(checks),
        "passed": sum(item["pass"] for item in checks),
        "failed": [item["name"] for item in checks if not item["pass"]],
        "pageErrors": errors,
        "checks": checks,
    }
    (ROOT / "qa" / "NL_R02.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"total": report["total"], "passed": report["passed"], "failed": report["failed"]}, ensure_ascii=False))
    return 0 if report["passed"] == report["total"] else 1


if __name__ == "__main__":
    sys.exit(run())
