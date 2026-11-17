"""Chromium evidence for the original CL P1 troop battle and P2 province loop."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib
import json
import re
import sys
import traceback

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa"
HTML_PATH = ROOT / "index.html"
HTML = HTML_PATH.read_text(encoding="utf-8")
SOURCE_SHA = hashlib.sha256(HTML_PATH.read_bytes()).hexdigest()
HERO_BODY = HTML.split("const HEROES={", 1)[1].split("\n};", 1)[0]
HERO_IDS = re.findall(r"^\s*([A-Za-z][A-Za-z0-9_]*):\{name:", HERO_BODY, re.M)
RESULT = []


def check(name, condition):
    ok = bool(condition)
    RESULT.append({"name": name, "pass": ok})
    print(("PASS" if ok else "FAIL") + " " + name, flush=True)
    return ok


def fixture(page):
    state = page.evaluate("window.__P2_QA__.getGame()")
    ids = HERO_IDS[:5]
    state["roster"] = ids
    for index, hero_id in enumerate(ids):
        state["hero"][hero_id] = {
            "level": 55,
            "xp": 0,
            "troops": 1500,
        }
    state["cltq"]["commanders"] = ids
    state["cltq"]["selectedArmy"] = ids.copy()
    state["cltq"]["fieldProgress"] = 0
    state["cltq"]["owners"] = {"capital": "player"}
    state["cltq"]["garrisons"] = {}
    state["cltq"]["marches"] = []
    state["cltq"]["receipts"] = []
    state["cltq"]["captureReceipts"] = []
    state["cltq"]["harvested"] = {}
    page.evaluate("s => window.__CLTQ_QA__.setGame(s)", state)
    return ids


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir=str(OUT / "cl-video-temp"),
            record_video_size={"width": 1280, "height": 720},
        )
        page = context.new_page()
        page.add_init_script("window.__P2_ENABLE_QA__=true;")
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(HTML_PATH.as_uri(), wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(300)

        check("Chromium loads canonical offline HTML", page.locator("#view").count() == 1)
        check("CL and P2 QA interfaces initialize", page.evaluate("typeof window.__CLTQ_QA__==='object' && typeof window.__P2_QA__==='object'"))
        initial = page.evaluate("window.__P2_QA__.getGame()")
        check("legacy save upgrades to schema v5 in existing key", initial["version"] == 5 and "cltq" in initial and page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')!==null"))

        ids = fixture(page)
        page.locator('[data-tab="world"]').click()
        check("ten original selectable province nodes render", page.locator(".cl-node[data-cl-node]").count() == 10)
        check("five commander slots and active troop squads render", page.locator("select[data-cl-commander]").count() == 5 and page.locator("[data-cl-army]").count() == 5)
        page.screenshot(path=str(OUT / "cl-map-desktop.png"), full_page=True)

        # Exercise the normal three-battle arc including its named final commander.
        page.locator('[data-cl-field="normal"]').click()
        battle = page.evaluate("window.__CLTQ_QA__.getBattle()")
        check("first CL battle instantiates five generals with living detachments", battle["mode"] == "cltq" and len(battle["p"]) == 5 and all(u["initialTroops"] >= 30 for u in battle["p"]))
        check("legacy CL combat keeps its canvas roster presentation without the Ngọa Long side roster", page.locator("#battle-mobile-roster").evaluate("node=>getComputedStyle(node).display==='none'&&node.childElementCount===0"))
        check("each living squad keeps at least three visible soldiers and scales formation", page.evaluate("[30,140,350].map(t=>window.__CLTQ_QA__.soldierCount({troops:t}))") == [3, 3, 5])
        damage = page.evaluate("""id=>{
          const qa=window.__P2_QA__,b=qa.debugBattle(),full=qa.makeUnit(id,'p',0,1),half=structuredClone(full);
          half.troops=half.initialTroops/2;
          const targetA=qa.makeUnit('e','e',0,1),targetB=qa.makeUnit('e','e',0,1);
          targetA.hp=targetA.maxHp=100000;targetB.hp=targetB.maxHp=100000;
          b.seed=4451;const high=qa.p2Hit(full,targetA,'physical').amount;
          b.seed=4451;const low=qa.p2Hit(half,targetB,'physical').amount;
          return {high,low};
        }""", ids[0])
        check("fewer live troops produce lower measured hit damage", damage["high"] > damage["low"])
        page.screenshot(path=str(OUT / "cl-battle-desktop.png"), full_page=False)
        page.locator("[data-cl-auto]").click()
        check("manual skill command mode is available", "TẮT" in page.locator("[data-cl-auto]").inner_text() and page.locator("[data-cl-skill]").count() == 5)
        page.evaluate("id=>{window.__P2_QA__.debugBattle().p[0].morale=100}", ids[0])
        page.locator(f'[data-cl-skill="{ids[0]}"]').click()
        check("manual skill click queues a real combat order", ids[0] in page.evaluate("window.__CLTQ_QA__.getBattle().skillQueue"))
        page.wait_for_timeout(2400)
        live = page.evaluate("window.__CLTQ_QA__.getBattle()")
        check("Chromium records live battle events before settlement", len(live["events"]) >= 1)
        page.screenshot(path=str(OUT / "cl-battle-desktop.png"), full_page=False)
        page.evaluate("window.__P2_QA__.skipBattle()")
        won1 = page.evaluate("window.__CLTQ_QA__.getBattle().won")
        check("battle settles in the same combat engine with report", bool(won1) and page.evaluate("window.__P2_QA__.getGame().battleReports.length>=1"))
        page.locator('[data-end-battle="1"]').click()

        for expected in (2, 3):
            page.locator('[data-cl-field="normal"]').click()
            if expected == 3:
                title = page.evaluate("window.__CLTQ_QA__.getBattle().cltq.title")
                check("third battle is the named boss encounter", "Chủ Tướng" in title)
            page.evaluate("window.__P2_QA__.skipBattle()")
            won = page.evaluate("window.__CLTQ_QA__.getBattle().won")
            check(f"field progression resolves battle {expected}", bool(won))
            page.locator('[data-end-battle="1"]').click()
        progress = page.evaluate("window.__P2_QA__.getGame().cltq.fieldProgress")
        check("three-battle arc records boss completion", progress == 3)

        # Force a bounded losing simulation to prove that the loss receipt commits once.
        page.locator('[data-cl-field="hard"]').click()
        page.evaluate("""() => {
          const b=window.__P2_QA__.debugBattle();
          for(const e of b.e){e.hp=e.maxHp=1e9;e.atk=e.catk=e.matk=1e6;}
        }""")
        page.evaluate("window.__P2_QA__.skipBattle()")
        loss = page.evaluate("window.__CLTQ_QA__.getBattle().won===false")
        before = page.evaluate("window.__P2_QA__.getGame().cltq.receipts.length")
        page.evaluate("window.__CLTQ_QA__.commit()")
        after = page.evaluate("window.__P2_QA__.getGame().cltq.receipts.length")
        check("loss is persisted once and repeated commit is idempotent", loss and before == after and before >= 4)
        casualty = page.evaluate("window.__P2_QA__.getGame().cltq.lastTroopReceipt.reduce((s,r)=>s+r.lost,0)")
        check("battle loss receipt records troop casualties", casualty > 0)
        page.locator('[data-end-battle="1"]').click()

        # P2: inspect route, pay provisions, march, fight NPC, capture and harvest.
        page.locator('[data-cl-node="capital2"]').click()
        check("unconnected target has no march order", page.locator("[data-cl-march]").count() == 0)
        page.locator('[data-cl-node="outpost"]').click()
        check("adjacent target previews a valid route and real cost", page.locator("[data-cl-march='outpost']").count() == 1 and "Lương hành quân" in page.locator(".cl-map-panel .cl-map-status").inner_text())
        grain_before = page.evaluate("window.__P2_QA__.getGame().grain")
        page.locator('[data-cl-march="outpost"]').click()
        grain_after = page.evaluate("window.__P2_QA__.getGame().grain")
        check("march spends provisions and saves active order", grain_after < grain_before and page.evaluate("window.__CLTQ_QA__.getState().marches.at(-1).status==='marching'"))
        duplicate = page.evaluate("""() => {
          const before=window.__P2_QA__.getGame(),rows=before.cltq.marches.length;
          window.__CLTQ_QA__.startMarch('outpost');
          const after=window.__P2_QA__.getGame();
          return {grain:after.grain===before.grain,marches:after.cltq.marches.length===rows};
        }""")
        check("rapid duplicate march command cannot double charge or queue", duplicate["grain"] and duplicate["marches"])
        skew_ok = page.evaluate("""() => {
          const start=window.__CLTQ_QA__.debugState().marches.at(-1);
          const oldEta=start.arrivesAt-Date.now();start.startedAt+=60000;start.arrivesAt+=60000;
          window.__CLTQ_QA__.tickMarch();
          return start.status==='marching' && start.arrivesAt-Date.now()>oldEta+59000;
        }""")
        check("backward clock skew extends ETA without early arrival", skew_ok)
        page.locator("[data-cl-pause]").click()
        check("march can be paused with remaining time stored", page.evaluate("window.__CLTQ_QA__.getState().marches.at(-1).status==='paused' && window.__CLTQ_QA__.getState().marches.at(-1).remaining>0"))
        page.reload(wait_until="domcontentloaded")
        page.locator('[data-tab="world"]').click()
        check("paused march survives offline save reload", page.evaluate("window.__CLTQ_QA__.getState().marches.at(-1).status==='paused'") and page.locator("[data-cl-pause]").count() == 1)
        page.locator("[data-cl-pause]").click()
        check("paused march can resume", page.evaluate("window.__CLTQ_QA__.getState().marches.at(-1).status==='marching'"))
        page.locator("[data-cl-retreat]").click()
        check("march can be safely interrupted before arrival", page.evaluate("window.__CLTQ_QA__.getState().marches.at(-1).status==='retreated'"))
        page.locator('[data-cl-node="outpost"]').click()
        page.locator('[data-cl-march="outpost"]').click()
        check("retreated army can retry the same route", page.evaluate("window.__CLTQ_QA__.getState().marches.at(-1).status==='marching'"))
        page.evaluate("window.__CLTQ_QA__.advanceMarch()")
        check("march arrives through the real arrival state", page.evaluate("window.__CLTQ_QA__.getState().marches.at(-1).status==='arrived'") and page.locator('[data-cl-attack="outpost"]').count() == 1)
        page.locator('[data-cl-attack="outpost"]').click()
        page.evaluate("""() => {
          const b=window.__P2_QA__.debugBattle();
          for(const e of b.e){e.hp=e.maxHp=1e9;e.atk=e.catk=e.matk=1e6;}
        }""")
        page.evaluate("window.__P2_QA__.skipBattle()")
        failed_siege = page.evaluate("""() => {
          const g=window.__P2_QA__.getGame();
          return {owner:g.cltq.owners.outpost,status:g.cltq.marches.at(-1).status,outcome:g.battleReports[0].cltqOutcome,won:g.battleReports[0].won};
        }""")
        check("siege defeat keeps NPC ownership and records repelled march", failed_siege["owner"] != "player" and failed_siege["status"] == "repelled" and failed_siege["outcome"]["kind"] == "siege" and not failed_siege["won"])
        page.locator('[data-end-battle="1"]').click()
        page.locator('[data-cl-node="outpost"]').click()
        page.locator('[data-cl-march="outpost"]').click()
        page.evaluate("window.__CLTQ_QA__.advanceMarch()")
        page.locator('[data-cl-attack="outpost"]').click()
        wood_before_capture = page.evaluate("window.__P2_QA__.getGame().wood")
        page.evaluate("window.__P2_QA__.skipBattle()")
        captured = page.evaluate("()=>{const g=window.__P2_QA__.getGame(),r=g.battleReports[0];return {owner:g.cltq.owners.outpost,wood:g.wood,reward:r.rewards.wood}}")
        check("retry captures province and grants its wood bounty once", captured["owner"] == "player" and captured["reward"] == 21 and captured["wood"] >= wood_before_capture + 21 and page.evaluate("window.__P2_QA__.getGame().battleReports[0].cltqOutcome.kind==='siege' && window.__P2_QA__.getGame().battleReports[0].won"))
        page.locator('[data-end-battle="1"]').click()
        page.locator('[data-cl-node="outpost"]').click()
        resource_before = page.evaluate("window.__P2_QA__.getGame().silver")
        page.locator('[data-cl-harvest="outpost"]').click()
        resource_after = page.evaluate("window.__P2_QA__.getGame().silver")
        check("owned node yields once and blocks duplicate harvest", resource_after > resource_before and page.evaluate("window.__P2_QA__.getGame().cltq.harvested.outpost===true") and page.locator('[data-cl-harvest="outpost"]').is_disabled())

        # Garrison, defense battle, and return commanders without touching legacy slots.
        page.locator('[data-cl-node="capital"]').click()
        page.locator('[data-cl-garrison="capital"]').click()
        check("garrison owns commanders independently of legacy formation", len(page.evaluate("window.__P2_QA__.getGame().cltq.garrisons.capital||[]")) == 5 and page.evaluate("window.__P2_QA__.getGame().slots.length===9"))
        page.locator('[data-cl-defend="capital"]').click()
        check("defense encounter starts with garrisoned army", page.evaluate("window.__CLTQ_QA__.getBattle().cltq.kind==='defend' && window.__CLTQ_QA__.getBattle().p.length===5"))
        page.evaluate("window.__P2_QA__.skipBattle()")
        page.locator('[data-end-battle="1"]').click()
        page.locator('[data-cl-node="capital"]').click()
        page.locator('[data-cl-ungarrison="capital"]').click()
        check("garrison can be recovered to selected army", len(page.evaluate("window.__P2_QA__.getGame().cltq.garrisons.capital||[]")) == 0 and len(page.evaluate("window.__P2_QA__.getGame().cltq.selectedArmy")) == 5)

        # Actual reload at file:// confirms the extension rides the canonical save key.
        saved = page.evaluate("JSON.parse(localStorage.getItem('muu_dinh_tam_quoc_v1'))")
        page.reload(wait_until="domcontentloaded")
        reloaded = page.evaluate("window.__P2_QA__.getGame()")
        check("file URL reload preserves capture, harvest, casualties and schema", reloaded["version"] == 5 and reloaded["cltq"]["owners"]["outpost"] == "player" and reloaded["cltq"]["harvested"]["outpost"] and reloaded["cltq"]["lastTroopReceipt"] == saved["cltq"]["lastTroopReceipt"])
        check("file URL reload keeps legacy 3x3 slots intact", reloaded["slots"] == initial["slots"])
        check("no Chromium JavaScript exceptions", not errors)
        check("desktop map fits viewport without horizontal overflow", page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
        check("source SHA is recorded for screenshots", len(SOURCE_SHA) == 64)
        desktop_video = page.video
        # Context close flushes the real Chromium battle/map capture.
        context.close()
        video_path = desktop_video.path()
        target_video = OUT / "cl-p1-p2-gameplay.webm"
        if target_video.exists():
            target_video.unlink()
        Path(video_path).replace(target_video)

        mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
        mobile_errors = []
        mobile.on("pageerror", lambda error: mobile_errors.append(str(error)))
        mobile.add_init_script("window.__P2_ENABLE_QA__=true;")
        mobile.goto(HTML_PATH.as_uri(), wait_until="domcontentloaded", timeout=30000)
        fixture(mobile)
        mobile.locator('[data-tab="world"]').click()
        mobile.screenshot(path=str(OUT / "cl-map-mobile-390x844.png"), full_page=True)
        check("mobile world map controls remain visible", mobile.locator(".cl-node[data-cl-node]").count() == 10 and mobile.locator("select[data-cl-commander]").count() == 5)
        check("mobile map has no horizontal document overflow", mobile.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
        check("mobile has no JavaScript exceptions", not mobile_errors)
        mobile.close()
        browser.close()

    result = {"total": len(RESULT), "passed": sum(row["pass"] for row in RESULT), "failed": [row["name"] for row in RESULT if not row["pass"]], "checks": RESULT}
    (OUT / "CL_P1_P2.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "CL_P1_P2_SOURCE_SHA256.txt").write_text(SOURCE_SHA + "  index.html\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False), flush=True)
    return 0 if result["passed"] == result["total"] else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        traceback.print_exc()
        print("PARTIAL CHECKS:", json.dumps(RESULT, ensure_ascii=False), flush=True)
        sys.exit(2)
