"""HG-10 focused real file:// Chromium acceptance for offline AI castle interaction."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
HTML = ROOT / "Play-Heoofgaia-HG11.html"
OUT = ROOT / "docs" / "evidence" / "hg10"
QA = ROOT / "docs" / "qa" / "hg10"
OUT.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
checks = []
errors = []

def check(name, ok):
    checks.append({"name": name, "passed": bool(ok)})
    print(("PASS " if ok else "FAIL ") + name, flush=True)
    if not ok:
        raise AssertionError(name)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files"])
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.set_default_timeout(15000)
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        page.goto(HTML.as_uri(), wait_until="load")
        page.locator('[data-action="start"]').click()
        target = page.evaluate("""() => {
          const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),p=HOG_PAINTER;
          const t=E.TILES.find(x=>x.kind==='castle'&&x.aiOwner&&x.level===1);
          if(!t)return null;
          Object.assign(p.mapCamera(),{centerX:t.x,centerY:t.y,zoom:1.12});
          HOG_APP_DEBUG.render();
          return {key:t.key,name:t.value,army:{...E.aiCityAt(s,t.key).garrison}};
        }""")
        check("60 castles, 36 AI cities and one reachable tier-1 fort", target is not None and page.evaluate("HOG_ENGINE.TILES.filter(t=>t.kind==='castle').length") == 60 and page.evaluate("Object.keys(HOG_APP_DEBUG.getState().aiCities).length") == 36)
        canvas = page.locator("#world-canvas")
        canvas.scroll_into_view_if_needed()
        point = page.evaluate("""() => {
          const c=document.getElementById('world-canvas'),r=c.getBoundingClientRect(),z=HOG_PAINTER.mapCamera().zoom*48;
          return {x:r.left+(c.width/2+z/2)/c.width*r.width,y:r.top+(c.height/2+z/2)/c.height*r.height};
        }""")
        page.mouse.click(point["x"], point["y"])
        view = page.locator(".target-information").inner_text()
        check("Actual world-canvas pointer selects AI castle", "Thành AI" in view and target["name"] in view)
        predicted = page.evaluate("""() => {
          const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
          const target=E.TILES.find(t=>t.kind==='castle'&&t.aiOwner&&t.level===1);
          const route=E.pathfind(s.activeCastleKey,target.key);
          const armyFactor=E.armyMarchFactor(s),terrain=E.pathTravelCost(route);
          const game=E.marchDuration(E.heroStats(s,s.activeHero).spd,route,armyFactor);
          return {steps:route.length-1,terrain,armyFactor,wall:Math.ceil(game/s.speed),game,ap:8};
        }""")
        displayed=page.locator('[aria-label="Ước tính hành quân"]').inner_text()
        check("World ETA/AP preview matches canonical path and dispatch formula",
              f"{predicted['steps']} bước" in displayed and
              f"{predicted['terrain']} điểm địa hình" in displayed and
              f"sức quân ×{predicted['armyFactor']:.2f}" in displayed and
              f"ETA {predicted['wall']} giây thực" in displayed and
              f"{predicted['game']} giây game" in displayed and
              f"{predicted['ap']} AP" in displayed)
        page.screenshot(path=str(OUT / "ai-city-map-chrome.png"), full_page=True)
        page.evaluate("""() => {const s=HOG_APP_DEBUG.getState();s.fame=5800;HOG_APP_DEBUG.render()}""")
        ap_before = page.evaluate("HOG_APP_DEBUG.getState().ap")
        page.locator('[data-action="march"]').first.click()
        march = page.evaluate("""() => {const s=HOG_APP_DEBUG.getState();return {target:s.march?.target||null,ap:s.ap,toast:document.getElementById('toast')?.innerText||''}}""")
        print("AI dispatch receipt:", {"target":march["target"],"apBefore":ap_before,"apAfter":march["ap"],"toast":march["toast"]},flush=True)
        check("Actual UI dispatch opens a paid world march", march["target"] == target["key"] and 7 <= ap_before-march["ap"] <= 8.1)
        battle = page.evaluate("""() => {
          const s=HOG_APP_DEBUG.getState();s.march.remaining=.01;
          HOG_ENGINE.tick(s,s.lastTick+1000);HOG_APP_DEBUG.render();
          return {target:s.battle?.target,kind:s.battle?.kind,
            defenders:s.battle?.enemies.map(u=>({unitId:u.unitId,count:u.count}))};
        }""")
        check("AI defenders come from actual saved faction garrison", battle["target"] == target["key"] and battle["kind"] == "castle" and all(target["army"].get(q["unitId"]) == q["count"] for q in battle["defenders"]) and bool(battle["defenders"]))
        check("Real combat viewport is visible", page.locator("#battle-canvas").is_visible())
        check("Save v07 stores open AI battle", page.evaluate("HOG_APP_DEBUG.save()"))
        page.reload(wait_until="load")
        restored = page.evaluate("""() => {
          const s=HOG_APP_DEBUG.getState();return {target:s.battle?.target,
            defenders:s.battle?.enemies.map(u=>({unitId:u.unitId,count:u.count})),
            ai:Object.keys(s.aiCities||{}).length,valid:HOG_ENGINE.strictSave(s)};
        }""")
        check("Reload preserves AI battle, owner ledger and defender counts", restored["target"] == target["key"] and restored["defenders"] == battle["defenders"] and restored["ai"] == 36 and restored["valid"])
        check("No browser JavaScript exceptions", not errors)
        browser.close()
finally:
    receipt={"total":len(checks),"passed":sum(int(q["passed"]) for q in checks),
             "failed":sum(int(not q["passed"]) for q in checks),
             "checks":checks,"errors":errors,
             "fixture":"Fame is set to 5800 only for Chrome QA; normal gameplay remains unchanged."}
    (QA / "world-ai-chrome.json").write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding="utf-8")
