#!/usr/bin/env python3
"""B1 Chromium: real campaign/formation UI, no duplicate battle or Save owner."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(name,condition):
    result=bool(condition)
    checks.append((name,result))
    print(("PASS " if result else "FAIL ")+name,flush=True)
def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        ctx=browser.new_context(viewport={"width":1280,"height":720})
        ctx.add_init_script("window.__P2_ENABLE_QA__=true")
        page=ctx.new_page()
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.goto((ROOT/"index.html").as_uri(),wait_until="domcontentloaded")
        info=page.evaluate("""() => {
          const q=window.__NL_B1_QA__,state=window.__P2_QA__.getGame();
          const a=q.stageIntel(1),b=q.stageIntel(28);
          return {version:q.version,authority:q.nativeAuthority,threshold:q.threshold,
            n1:a.slots.length,enemy1:a.enemy.length,boss28:b.boss,
            cycle:q.cycle,save:state.version,clear:state.cleared.length};
        }""")
        check("native P2 and Save v5 remain sole authorities",
              info["authority"]=="P2" and info["save"]==5 and info["clear"]==0)
        check("source-grounded 3x3 / 100-morale and classic troop cycle",
              info["n1"]==9 and info["threshold"]==100 and
              info["cycle"]=={"infantry":"spear","spear":"cavalry","cavalry":"infantry"})
        check("28th stage remains Boss and stage1 has source NPCs",
              info["boss28"] and info["enemy1"]>=3)
        page.locator('.nav[data-tab="campaign"]').click()
        check("campaign has an actionable live matchup advisor",
              page.locator('[data-nlb1-advisor]').count()==1 and
              "100 sĩ khí" in page.locator('[data-nlb1-advisor]').inner_text())
        # UI V2 makes every feature a semantic window. Locate the window
        # containing the advisor and navigate there as the real user would.
        found=False
        for n in range(page.locator('#nl-screen-select option').count()):
            page.locator('#nl-screen-select').select_option(str(n))
            if page.locator('[data-nlb1-formation]').is_visible():
                found=True
                break
        check("B1 tactical advisor button is reachable through the window selector",found)
        if found:
            page.locator('[data-nlb1-formation]').click()
        check("tactical button navigates to real Formation view",
              page.locator('.nav.active[data-tab="formation"]').count()==1)
        battle=page.evaluate("""() => {
          const qa=window.__P2_QA__,g=qa.getGame();
          g.silver=100000;g.grain=100000;
          qa.setGame(g);qa.beginBattle(1,'campaign');
          const state=qa.debugBattle();
          return {active:!!state,mode:state?.mode,
            p:state?.p?.length,e:state?.e?.length,
            saveVersion:qa.getGame().version};
        }""")
        check("one real campaign battle still opens",battle["active"] and
              battle["p"]>=1 and battle["e"]>=3 and battle["saveVersion"]==5)
        check("native battle displays live 100-morale readiness",
              page.locator('[data-nlb1-battle]').count()==1 and
              "100" in page.locator('[data-nlb1-battle]').inner_text())
        check("no browser page exceptions",not errors)
        browser.close()
    print("NL_CLASSIC_B1:",sum(ok for _,ok in checks),"/",len(checks),flush=True)
    return 0 if all(ok for _,ok in checks) else 1
if __name__=="__main__":
    raise SystemExit(main())
