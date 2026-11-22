#!/usr/bin/env python3
"""A3 authoritative Chromium browser gate: 411 prices, idempotent transactions, Save v5."""
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML=Path(__file__).resolve().parents[1]/"index.html"

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
        context=browser.new_context(viewport={"width":1280,"height":720})
        context.add_init_script("window.__P2_ENABLE_QA__=true")
        page=context.new_page()
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.goto(HTML.as_uri(),wait_until="domcontentloaded")
        outcome=page.evaluate("""() => {
          const q=window.__NL_A3_QA__,g=window.__P2_QA__.getGame();
          const all=q.prices(),shop=all.filter(x=>x.cost);
          const item=all.find(x=>x.id==='mdt-equip02-1');
          const f=structuredClone(g);
          f.silver=2000000;f.grain=2000000;f.iron=777;
          const buy=q.dryBuy(f,item.id,'a3:buy:one');
          const duplicate=buy.ok?q.dryBuy(buy.state,item.id,'a3:buy:one'):null;
          const uid=buy.state.items.find(x=>x.base===item.id && !f.items.some(y=>y.uid===x.uid))?.uid;
          const u=buy.ok?q.dryReinforce(buy.state,uid,'a3:reinforce:one'):null;
          const doubleUpgrade=u?.ok?q.dryReinforce(u.state,uid,'a3:reinforce:one'):null;
          const starved=structuredClone(buy.state);starved.grain=0;
          const blocked=q.dryReinforce(starved,uid,'a3:reinforce:poor');
          const refineState=structuredClone(u.state);
          refineState.nlItemsV1.stacks['mdt-tinh-khoang']=15;
          const refined=q.dryRefine(refineState,uid,'a3:refine:one');
          const again=refined.ok?q.dryRefine(refined.state,uid,'a3:refine:one'):null;
          return {
            count:all.length,priced:shop.length,
            allNoIron:all.every(x=>!x.cost||!Object.hasOwn(x.cost,'iron')),
            distinctIds:new Set(all.map(x=>x.id)).size,
            activeModel:q.source,sourceRefs:q.references,
            price:item?.cost,quote:q.reinforceCost(1),
            oldShop:q.legacyPrice('mdt-equip02-1'),
            buyOk:buy.ok,buySilver: f.silver-buy.state.silver,buyGrain:f.grain-buy.state.grain,
            buyIronKept:buy.state.iron===f.iron,
            duplicate:duplicate?.ok&&duplicate?.duplicate&&duplicate.state===buy.state,
            upgradeOk:u?.ok,upgradeSilver:buy.state.silver-u?.state.silver,
            upgradeGrain:buy.state.grain-u?.state.grain,
            upgradeIronKept:u?.state.iron===buy.state.iron,
            upgradeOnce:doubleUpgrade?.ok&&doubleUpgrade?.duplicate,
            poorBlocked:!blocked.ok&&blocked.code==='INSUFFICIENT_RESOURCES'
                        &&JSON.stringify(blocked.state)===JSON.stringify(starved),
            refineOk:refined.ok,refineIronKept:refined.state.iron===refineState.iron,
            refineOnce:again?.ok&&again?.duplicate,
            beforeUid:f.items.map(x=>x.uid),afterUid:refined.state.items.map(x=>x.uid),
            legacySaveVersion:refined.state.version===5
          };
        }""")
        checks={
          "411 playable ID prices with no iron":outcome["count"]==411 and outcome["distinctIds"]==411 and outcome["allNoIron"],
          "392 reference gear untouched":outcome["sourceRefs"]==392,
          "simulated conversion is declared":outcome["activeModel"]["provenance"]=="PROJECT_SIMULATED",
          "purchase A3 quote":outcome["price"]=={"silver":1536,"grain":77},
          "legacy 19-shop uses same quote":outcome["oldShop"]==outcome["price"],
          "single purchase exact debit":outcome["buyOk"] and outcome["buySilver"]==1536 and outcome["buyGrain"]==77 and outcome["buyIronKept"],
          "duplicate purchase immutable":outcome["duplicate"],
          "reinforce quoted and charged once":outcome["quote"]=={"silver":770,"grain":53} and outcome["upgradeOk"] and outcome["upgradeSilver"]==770 and outcome["upgradeGrain"]==53 and outcome["upgradeIronKept"] and outcome["upgradeOnce"],
          "negative/insufficient resource atomic":outcome["poorBlocked"],
          "refinement material without iron":outcome["refineOk"] and outcome["refineIronKept"] and outcome["refineOnce"],
          "Save v5 remains schema 5":outcome["legacySaveVersion"],
          "no page exceptions":not errors
        }
        for key,ok in checks.items():
            print(("PASS " if ok else "FAIL ")+key,flush=True)
        if not all(checks.values()):
            import json
            print("A3_DIAGNOSTICS "+json.dumps(outcome,ensure_ascii=False),flush=True)
        browser.close()
        return 0 if all(checks.values()) else 1

if __name__=="__main__":
    raise SystemExit(main())
