#!/usr/bin/env python3
"""Content C live Chromium smoke; actual P2 launch, one action, and native settlement."""
from playwright.sync_api import sync_playwright
from nl_native_pve_a1_browser import open_page, errors

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
        page=open_page(browser)
        out=page.evaluate("""()=>{
          const q=window.__P2_QA__,c=window.__NL_CONTENT_C_QA__;
          if(!q||!c)return {loaded:false};
          const g=q.getGame(),id=g.roster[0];
          g.cleared=Array.from({length:28},(_,i)=>i+1);g.silver=1000000;g.grain=1000000;
          g.slots=[id,null,null,null,null,null,null,null,null];
          g.hero[id].troops=3000;g.hero[id].level=60;
          g.nlClassicA.orders=60;g.towerFloor=20;g.activity.towerTries=3;
          q.setGame(g);
          const m=c.map('wiki-map-1'),n=m.npcs[0],orders=q.getGame().nlClassicA.orders;
          const checks={loaded:true,coverage:c.counts.maps===249&&c.counts.npcs===4903&&c.counts.runtimeHeroes===368&&c.tiers()===40,
            nativeStart:c.startNpc(n.id),oneOrder:q.getGame().nlClassicA.orders===orders-1};
          let b=q.debugBattle();
          checks.formation=b?.e.length===n.units.length&&b.e.every((e,i)=>e.slot===n.units[i][0]&&e.name===n.units[i][1]);
          if(!b)return checks;
          const enemy=b.e[0];enemy.morale=100;q.perform(enemy);
          checks.nativeAction=b.events.length===1;
          // Deterministic forced victory exercises the real native finish owner, not balance.
          for(const u of b.e)u.hp=0;
          if(!b.finished)q.finishBattle();
          const s=q.getGame(),report=b.report;
          checks.settlement=b.won&&c.state().cleared[n.id]===true&&s.cleared.length===28&&report?.nlContentC?.id===n.id&&report?.rewards?.iron===undefined;
          const balance=s.silver;q.finishBattle();checks.noDuplicate=q.getGame().silver===balance;
          q.closeBattle('city');
          checks.tower=c.startTower()&&q.debugBattle()?.nlContentC?.floor===21&&q.getGame().activity.towerTries===2;
          q.closeBattle('city');
          checks.seals=c.unlockSeal('sword')&&c.equipSeal('sword')&&!c.unlockSeal('sword');
          checks.panels=c.panels().every(x=>x.includes('data-nlc-panel'));
          checks.saveV5=q.getGame().version===5;
          return checks;
        }""")
        print(out,flush=True)
        browser.close()
    assert out and all(out.values()) and not errors, (out,errors)
if __name__=="__main__":
    main()
