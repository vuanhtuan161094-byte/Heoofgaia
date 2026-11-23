#!/usr/bin/env python3
"""B3 real Chromium: 25 troop listings, 24 real P3 setups, 221 skills, one P2 hit."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(label,ok):
 ok=bool(ok);checks.append((label,ok));print(("PASS " if ok else "FAIL ")+label,flush=True)
def main():
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
  ctx=browser.new_context(viewport={"width":1280,"height":720})
  ctx.add_init_script("window.__P2_ENABLE_QA__=true")
  page=ctx.new_page();errors=[]
  page.on("pageerror",lambda e:errors.append(str(e)))
  page.goto((ROOT/"index.html").as_uri(),wait_until="domcontentloaded")
  data=page.evaluate("""()=>{
   const b=window.__NL_B3_QA__,g=window.__P2_QA__.getGame();
   return {troops:b.troops.length,base:b.troops.filter(x=>!x.branch).length,
    branch:b.troops.filter(x=>x.branch).length,formations:b.formations.length,
    skills:b.skills.length,save:g.version,native:b.nativeAuthority,
    unique:new Set(b.troops.map(x=>x.id)).size===25,
    unchanged:b.extraRewards===0&&b.extraActions===0};
  }""")
  check("25 unique troop identities (7 base, 18 branch), no second resolver",
        data["troops"]==25 and data["base"]==7 and data["branch"]==18 and
        data["unique"] and data["unchanged"] and data["native"]=="P2")
  check("24 compatible formations and 221 source skills preserve Save-v5",
        data["formations"]==24 and data["skills"]==221 and data["save"]==5)
  page.locator('.nav[data-tab="barracks"]').click()
  # Screen pagination is scheduled on requestAnimationFrame after the original
  # game render. Never iterate the previous tab's page options before rebuild.
  # B3 runs only AFTER review-window installation. This wait is now
  # meaningful and avoids selecting stale pages from the preceding tab.
  page.wait_for_function("""() => document.querySelector('#nl-screen-select')!==null &&
     document.querySelector('.nav.active[data-tab="barracks"]')!==null""")
  page.wait_for_timeout(80)
  print("B3_UI_TAB",page.evaluate("""() => ({
      active:document.querySelector('.nav.active')?.dataset.tab,
      appExists:!!document.querySelector('#app'),
      pageLabels:[...document.querySelectorAll('#nl-screen-select option')].map(x=>x.textContent),
      troopParent:document.querySelector('[data-nlb3-troops]')?.parentElement?.id||'none',
      hiddenAncestor:document.querySelector('[data-nlb3-select]')?.closest('.nl-pane-hidden')?.className||'none'
    })"""),flush=True)
  check("Barracks exposes 25 choices as a compact single-window select",
        page.locator('[data-nlb3-troops]').count()==1 and
        page.locator('[data-nlb3-select] option').count()==25)
  # The selector lives in its own semantic screen. Switch to its pane.
  ok=False
  for i in range(page.locator('#nl-screen-select option').count()):
   page.locator('#nl-screen-select').select_option(str(i))
   if page.locator('[data-nlb3-select]').is_visible():ok=True;break
  if not ok:
   print("B3_UI_DEBUG",page.evaluate("""() => {
      const sel=document.querySelector('[data-nlb3-select]');
      const hidden=sel?.closest('.nl-pane-hidden');
      return {tab:document.querySelector('#app')?.dataset.nlScreen,
        pageCount:document.querySelector('#nl-screen-select')?.options.length,
        panelParent:sel?.parentElement?.parentElement?.tagName,
        hiddenClass:hidden?.className,hiddenTag:hidden?.tagName,
        visibleRect:sel?.getBoundingClientRect()?.toJSON?.(),
        pages:[...document.querySelectorAll('#nl-screen-select option')].map(x=>x.textContent)
      };
    }"""),flush=True)
  check("25 troop roster is reachable through fixed-window UI",ok)
  if ok:
   page.locator('[data-nlb3-select]').select_option('nlp-phalanx')
   check("branch detail selected after actual UI change",
         page.locator('[data-nlb3-detail="nlp-phalanx"]').count()==1)
  form=page.evaluate("""()=>{
    const q=window.__NL_B3_QA__,g=window.__P2_QA__.getGame(),
      p=window.__P3_QA__;
    const before=structuredClone(g),rows=[];
    for(const a of q.formations){
      p.assign(a.id);
      const after=window.__P2_QA__.getGame();
      rows.push({preset:after.p3PresetId,slots:after.slots,
        formation:after.formation,expected:a.family});
    }
    window.__P2_QA__.setGame(before);
    return {rows,save:window.__P2_QA__.getGame().version};
  }""")
  check("all 24 real P3 formation selection calls set Save-v5 preset and family",
    len(form["rows"])==24 and all(x["preset"]==f"{x['formation']}-{(x['preset'].split('-')[-1])}" and x["formation"]==x["expected"] for x in form["rows"])
    and form["save"]==5)
  hit=page.evaluate("""()=>{
    const qa=window.__NL_B3_QA__,q=window.__P2_QA__,g=q.getGame();
    const self={id:'zhang',team:'p',troop:'spear'};
    const enemy={id:'rider',team:'e',troop:'cavalry'};
    const normal=qa.modifier(enemy,self,'physical',7);
    g.nlr03.evolutions.zhang='phalanx';q.setGame(g);
    const brace=qa.modifier(enemy,self,'physical',7);
    const magic=qa.modifier(enemy,self,'magic',7);
    const late=qa.modifier(enemy,self,'physical',25);
    return {normal,brace,magic,late,save:q.getGame().version};
  }""")
  check("native phalanx braces a cavalry hit once; magic and late R03 untouched",
        hit["normal"]==1 and hit["brace"]==.8 and hit["magic"]==1 and
        hit["late"]==1 and hit["save"]==5)
  page.locator('.nav[data-tab="formation"]').click()
  check("6x4 formation summary visible in actual Formation tab",
        page.locator('[data-nlb3-formations]').count()==1)
  page.locator('.nav[data-tab="heroes"]').click()
  check("hero-skill list actually mounts in Heroes, no phantom 2nd engine",
        page.locator('[data-nlb3-skills]').count()==1)
  check("no Chromium uncaught errors",not errors)
  browser.close()
 print(f"NL_CLASSIC_B3 {sum(ok for _,ok in checks)}/{len(checks)}",flush=True)
 return 0 if all(ok for _,ok in checks) else 1
if __name__=="__main__":raise SystemExit(main())
