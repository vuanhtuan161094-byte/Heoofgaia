#!/usr/bin/env python3
"""A1 Chromium: native 28-stage Boss policy, troop IDs, Save-v5/replay/receipt boundary."""
from __future__ import annotations
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
SAVE_KEY="muu_dinh_tam_quoc_v1"
STUB="""<script>window.__P2_ENABLE_QA__=true;
const __store=__NL_STORE__;Object.defineProperty(window,'localStorage',{configurable:true,value:{
getItem:k=>Object.prototype.hasOwnProperty.call(__store,k)?__store[k]:null,
setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k],
clear:()=>Object.keys(__store).forEach(k=>delete __store[k])}});</script>"""
checks=[]
errors=[]
def check(name,value):
    ok=bool(value);checks.append({"name":name,"pass":ok})
    print(("PASS " if ok else "FAIL ")+name,flush=True)

def open_page(browser,stored=None,width=1280):
    page=browser.new_page(viewport={"width":width,"height":720 if width>600 else 844})
    page.on("pageerror",lambda e:errors.append(str(e)))
    data={} if stored is None else {SAVE_KEY:stored}
    page.set_content(HTML.replace("<script>",STUB.replace("__NL_STORE__",
        json.dumps(data,ensure_ascii=False))+"<script>",1),wait_until="domcontentloaded")
    return page

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
        page=open_page(browser)
        data=page.evaluate("()=>({a1:window.__NL_NATIVE_A1_QA__?.coverage(),save:window.__P2_QA__.getGame().version})")
        a1=data["a1"] or {}
        check("one native game, 28 missions, eight Boss IDs, 25 troop identities",
              data["save"]==5 and a1.get("stages")==28 and
              a1.get("bosses")==[2,5,8,12,16,20,24,28] and
              a1.get("projectTroops")==25)
        check("no shadow resolver, duplicated morale or reward engine",
              a1.get("nativeSingleAuthority") is True and
              a1.get("dualResolver") is False and a1.get("extraMoraleGrants")==0 and
              a1.get("extraRewardWrites")==0)
        # This is the original QA game authority, not a secondary battle state.
        one=page.evaluate("""() => {
          const q=window.__P2_QA__,initial=q.getGame();
          const rows=[],errors=[];
          for(let stage=1;stage<=28;stage++){
            q.closeBattle('city');
            const g=structuredClone(initial);
            g.cleared=Array.from({length:stage-1},(_,i)=>i+1);
            g.silver=1000000;g.grain=1000000;g.iron=1000000;
            g.slots=['guan','zhang','liu','zhuge','huang',null,null,null,null];
            for(const id of g.slots.filter(Boolean))if(g.hero[id]){
              g.hero[id].troops=Math.max(500,g.hero[id].troops||0);
              g.hero[id].level=Math.max(40,g.hero[id].level||0);
            }
            q.setGame(g);q.beginBattle(stage,'campaign');
            const b=q.debugBattle();
            if(!b){errors.push('stage '+stage+' not open');continue;}
            const meta=window.__NL_NATIVE_A1_QA__.stage();
            const boss=!!([2,5,8,12,16,20,24,28].includes(stage));
            const troops=[...b.p,...b.e].filter(u=>u.nlTroopV2).length;
            rows.push({stage,boss:!!meta?.boss,native:meta?.p2Authority,
              secondResolver:meta?.secondResolver,sourceTroops:troops,
              enemies:b.e.length,hasOriginalOpen:!!b.opening});
            if(boss){
              let actor=b.e.find(u=>u.hp>0&&u.troop!=='drum')||b.e[0];
              actor.morale=100;b.round=3;
              const before=b.events.length,oldSilver=q.getGame().silver;
              q.perform(actor);
              const event=b.events.at(-1);
              const after=q.getGame().silver;
              if(b.events.length!==before+1||event?.nativeV2?.boss!==true ||
                 oldSilver!==after||event.hits?.some(h=>!Number.isFinite(h.amount)))
                 errors.push('Boss '+stage+' non-native/settlement discrepancy');
            }
          }
          q.closeBattle('city');q.setGame(initial);
          return {rows,errors,version:q.getGame().version};
        }""")
        check("all 28 live battles boot with native R02/R03 enemy slots",
              len(one["rows"])==28 and
              all(r["enemies"]>=3 and r["hasOriginalOpen"] and r["native"] and
                  not r["secondResolver"] and r["boss"]==(r["stage"] in [2,5,8,12,16,20,24,28])
                  for r in one["rows"]))
        check("all eight live Boss turns produce one native event without rewards",
              not one["errors"])
        check("troop identity fields are staged inside real battle units",
              all(r["sourceTroops"]>=1 for r in one["rows"]))
        test=page.evaluate("""()=>{
          const q=window.__P2_QA__,g=q.getGame();
          g.grain=1000000;g.silver=1000000;
          g.cleared=[];g.slots=['guan','zhang','liu','zhuge','huang',null,null,null,null];
          for(const id of g.slots.filter(Boolean))if(g.hero[id]){
            g.hero[id].troops=3000;g.hero[id].level=85;
          }
          q.setGame(g);q.beginBattle(1,'campaign');
          q.skipBattle();
          const report=q.getGame().battleReports.at(-1),r=q.getGame();
          const silver=r.silver,grain=r.grain,reports=r.battleReports.length;
          q.finishBattle();
          const after=q.getGame();
          q.p2OpenReplay(report);q.p2LoadReplayFrame(report.events.length);
          const replay=q.getGame();
          return {won:report?.won,events:report?.events?.length,version:after.version,
            once:after.silver===silver&&after.grain===grain&&
              after.battleReports.length===reports,
            replay:replay.silver===silver&&replay.grain===grain&&
              replay.battleReports.length===reports,
            a1Events:report?.events?.some(e=>e.nativeV2)||false};
        }""")
        check("native battle 1 wins and writes a single replayable P2 report",
              test["won"] and test["events"]>0 and test["version"]==5)
        check("finish and replay cannot settle rewards twice",test["once"] and test["replay"])
        check("real 1280px battle canvas remains accessible",
              page.locator("#battle-canvas").count()==1)
        check("no Chromium runtime errors on 28 stages + Boss/replay",not errors)
        page.close();browser.close()
    result={"name":"NL_NATIVE_PVE_A1","total":len(checks),
            "passed":sum(x["pass"] for x in checks),
            "failed":[x["name"] for x in checks if not x["pass"]],
            "errors":errors}
    (ROOT/"qa/NL_NATIVE_PVE_A1.json").write_text(
      json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(result,ensure_ascii=False),flush=True)
    return 0 if not result["failed"] else 1
if __name__=="__main__":
    sys.exit(main())
