#!/usr/bin/env python3
"""Focused live-browser A5-A9 integration. No external server or simulated combat solver."""
import sys
from playwright.sync_api import sync_playwright
from nl_native_pve_a1_browser import open_page, errors

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
        page=open_page(browser)
        result=page.evaluate("""()=>{
          const native=window.__P2_QA__,w=window.__NL_WORLD_A4_QA__,a=window.__NL_ADVANCED_QA__;
          if(!native||!w||!a)return {loaded:false};
          const g=native.getGame(),id=g.roster[0];
          g.silver=1000000;g.grain=1000000;g.prestige=2000;
          g.cleared=Array.from({length:24},(_,i)=>i+1);
          g.hero[id].level=40;g.hero[id].xp=0;
          if(g.nlClassicA){g.nlClassicA.merit=100000;g.nlClassicA.orders=60;}
          native.setGame(g);
          const checks={loaded:true,saveV5:native.getGame().version===5,
            office:w.move('xuchang')&&a.rankUp()&&a.salary()&&!a.salary(),
            guild:a.joinGuild()&&a.donate(),
            merchant:a.dispatch('horse')&&!a.collectDispatch(),
            growth:a.breakthrough(id)&&a.advancedTrain(id),
            achievement:a.achievement('advanced')&&!a.achievement('advanced'),
            ui:!!document.querySelector('[data-nla59-panel]')};
          const before=native.getGame().nlClassicA?.orders;
          checks.nativeWar=a.challenge('war','changan')&&native.debugBattle()?.mode==='campaign'&&native.getGame().nlClassicA?.orders===before-1;
          native.closeBattle('city');
          return checks;
        }""")
        print(result,flush=True)
        browser.close()
    return 0 if result and all(result.values()) and not errors else 1

if __name__=='__main__':
    sys.exit(main())
