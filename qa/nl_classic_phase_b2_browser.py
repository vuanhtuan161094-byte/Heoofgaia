#!/usr/bin/env python3
"""B2 original native P2 Chromium: drum, dancer, skills, Save-v5, no dual hit."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def check(label,ok):
    checks.append((label,bool(ok)))
    print(("PASS " if ok else "FAIL ")+label,flush=True)

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
        ctx=browser.new_context(viewport={"width":1280,"height":720})
        ctx.add_init_script("window.__P2_ENABLE_QA__=true")
        page=ctx.new_page()
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.goto((ROOT/"index.html").as_uri(),wait_until="domcontentloaded")
        page.locator('.nav[data-tab="formation"]').click()
        check("player sees Kỳ Cổ Thủ and Vũ Nữ role controls",
              page.locator('[data-troop-mode="liu:drum"]').count()==1
              and page.locator('[data-troop-mode="liu:dancer"]').count()==1)
        page.locator('[data-troop-mode="liu:drum"]').click()
        drum=page.evaluate("""() => {
          const q=window.__P2_QA__,g=q.getGame();
          g.silver=100000;g.grain=100000;q.setGame(g);
          q.beginBattle(1,'campaign');
          const b=q.debugBattle(),actor=b.p.find(u=>u.id==='liu');
          for(const u of [...b.p,...b.e])u.morale=10;
          b.order=[['p',actor.slot]];b.orderIndex=0;
          const enemyHP=b.e.map(u=>u.hp),before=b.events.length;
          q.stepBattle();
          const event=b.events.at(-1);
          return {actorTroop:actor.troop,mode:event.mode,
            actionCount:b.events.length-before,
            friendMorale:b.p.map(u=>u.morale),
            enemyMorale:b.e.map(u=>u.morale),
            enemyHpKept:b.e.every((u,i)=>u.hp===enemyHP[i]),
            save:q.getGame().version};
        }""")
        check("native ordinary drum emits ONE event and grants 25 to every ally",
              drum["actorTroop"]=="drum" and drum["mode"]=="drum" and
              drum["actionCount"]==1 and all(x==35 for x in drum["friendMorale"]))
        check("classic normal drum does not grant a hidden enemy debuff or damage",
              all(x==10 for x in drum["enemyMorale"]) and drum["enemyHpKept"])
        skill=page.evaluate("""() => {
          const q=window.__P2_QA__,b=q.debugBattle(),actor=b.p.find(u=>u.id==='liu');
          for(const u of [...b.p,...b.e])u.morale=10;
          actor.morale=100;b.order=[['p',actor.slot]];b.orderIndex=0;
          const before=b.events.length;
          q.stepBattle();
          return {mode:b.events.at(-1).mode,events:b.events.length-before,
            friends:b.p.filter(u=>u.id!==actor.id).map(u=>u.morale),
            own:actor.morale,enemy:b.e.map(u=>u.morale)};
        }""")
        check("100 morale triggers ONE drum skill: +45 others and -100 own",
              skill["mode"]=="drum" and skill["events"]==1 and
              all(x==55 for x in skill["friends"]) and skill["own"]==30)
        check("classic drum skill does not debuff enemy again",
              all(x==10 for x in skill["enemy"]))
        page.evaluate("window.__P2_QA__.closeBattle('formation')")
        page.locator('[data-troop-mode="liu:dancer"]').click()
        save=page.evaluate("""() => {
          const q=window.__P2_QA__,g=q.getGame();
          return {role:g.troopModes.liu,version:g.version,
            disk:localStorage.getItem('muu_dinh_tam_quoc_v1')};
        }""")
        check("dancer choice is persisted through existing Save-v5 troopModes",
              save["role"]=="dancer" and save["version"]==5 and
              '"dancer"' in (save["disk"] or ""))
        page.reload(wait_until="domcontentloaded")
        check("dancer role survives true page reload",
              page.evaluate("window.__P2_QA__.getGame().troopModes.liu")=="dancer")
        dance=page.evaluate("""() => {
          const q=window.__P2_QA__,g=q.getGame();g.silver=100000;g.grain=100000;
          q.setGame(g);q.beginBattle(1,'campaign');
          const b=q.debugBattle(),actor=b.p.find(u=>u.id==='liu');
          for(const u of [...b.p,...b.e])u.morale=70;
          actor.morale=10;const prior=b.e.map(u=>({hp:u.hp,morale:u.morale}));
          const before=b.events.length;
          b.order=[['p',actor.slot]];b.orderIndex=0;q.stepBattle();
          const ev=b.events.at(-1);
          return {troop:actor.troop,mode:ev.mode,own:actor.morale,
            events:b.events.length-before,hits:ev.hits?.length,
            targets:b.e.map((u,i)=>({hpKept:u.hp===prior[i].hp,
              delta:u.morale-prior[i].morale}))};
        }""")
        deltas=[x["delta"] for x in dance["targets"]]
        check("Vũ Nữ ordinary action drains exactly one enemy by 45 morale",
              dance["troop"]=="dancer" and dance["mode"]=="dancer" and
              dance["events"]==1 and sorted(deltas)==[-45]+[0]*(len(deltas)-1))
        check("Vũ Nữ native action does not apply a hit, but gains 34 own morale",
              dance["hits"]==0 and dance["own"]==44 and
              all(x["hpKept"] for x in dance["targets"]))
        elite=page.evaluate("""() => {
          const q=window.__P2_QA__;q.closeBattle('city');
          const g=q.getGame();g.cleared=Array.from({length:8},(_,i)=>i+1);
          q.setGame(g);q.beginBattle(9,'campaign');
          const b=q.debugBattle(),actor=b.e.find(x=>x.troop==='drum');
          if(!actor)throw Error('Stage9 veteran drummer missing');
          for(const u of [...b.p,...b.e])u.morale=10;
          b.order=[['e',actor.slot]];b.orderIndex=0;
          q.stepBattle();const ev=b.events.at(-1);
          return {trait:!!window.__P2_QA__.data.campaign.encounters.find(x=>x.stage===9).nlB2EliteMorale,
            event:ev.mode,allies:b.e.map(x=>x.morale),opponents:b.p.map(x=>x.morale)};
        }""")
        check("Stage9 author-tagged veteran drummer keeps elite +34 while basic drum stays +25",
              elite["trait"] and elite["event"]=="drum" and
              all(x>=44 for x in elite["allies"]) and
              all(x==5 for x in elite["opponents"]))
        check("no browser page exceptions",not errors)
        browser.close()
    print(f"NL_CLASSIC_B2 {sum(v for _,v in checks)}/{len(checks)}",flush=True)
    return 0 if all(ok for _,ok in checks) else 1

if __name__=="__main__":
    raise SystemExit(main())
