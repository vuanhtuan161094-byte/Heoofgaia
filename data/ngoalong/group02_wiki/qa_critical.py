"""Live browser QA for early, paginated and 100-million-army Wiki maps."""
import json,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from crawl_dungeons import get_index,get_npc_links,get_npc
checks=[];errors=[]

def check(name,ok,details=None):
    checks.append({"name":name,"pass":bool(ok),"details":details})
    print(("PASS " if ok else "FAIL ")+name,flush=True)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=["--no-sandbox"])
    page=browser.new_page(viewport={"width":1280,"height":720})
    maps=get_index(page)
    by_id={m["mapId"]:m for m in maps}
    check("Wiki index >=200 unique maps",len(by_id)>=200,len(by_id))
    for mid in (1,3,269):
        try:
            m=by_id[mid]
            links,warnings=get_npc_links(page,m)
            total=m.get("detailDeclaredNpcCount") or m.get("advertisedNpcCount")
            check(f"map {mid} full NPC list and no pagination warnings",
                total is not None and len(links)==total and not warnings,
                {"map":m["name"],"expected":total,"read":len(links),"warnings":warnings})
            orders=[x.get("listOrder") for x in links]
            check(f"map {mid} ordered unique named NPCs",
                orders==list(range(1,len(links)+1)) and all(x.get("name") for x in links),
                {"orders":orders[:26]})
            if mid==1:
                ba=next(x for x in links if x["name"]=="Ba Tài")
                detail=get_npc(page,ba)
                check("Ba Tai all occupied formation slots 3/5",
                    detail["fullTeamVerified"] and detail["formationOccupiedSlots"]==[3,5],
                    detail["formationOccupiedSlots"])
                check("Ba Tai 220+200 soldiers exactly 420",
                    detail["totalSoldiers"]==420 and detail["unitSoldierSumValid"] is True,
                    {"total":detail["totalSoldiers"],"units":detail["unitsObserved"]})
            if mid==269:
                first=links[0]
                check("High-level index 263.1 million soldiers is exact integer",
                    first["totalSoldiers"]==263_100_000,
                    {"name":first["name"],"soldiers":first["totalSoldiers"]})
                high=get_npc(page,first)
                check("High-level NPC full occupied 3x3 formation read",
                    high["fullTeamVerified"] is True and high["selectedUnitCount"]==high["formationDeclaredUnitCount"],
                    {"name":high["name"],"slots":high["formationOccupiedSlots"],"units":high["selectedUnitCount"]})
                unit_sum=sum(x["soldiers"] for x in high["unitsObserved"])
                check("High-level Wiki source displays 100000 soldier discrepancy, preserved without rewriting",
                    high["totalSoldiers"]==263_100_000 and unit_sum==263_000_000
                    and high["unitSoldierSumValid"] is False and high["unitSoldierDiscrepancy"]==100_000
                    and high["unitSoldierConsistencyStatus"]=="SOURCE_MISMATCH",
                    {"headlineSoldiers":high["totalSoldiers"],"unitSum":unit_sum,
                     "difference":high["unitSoldierDiscrepancy"],"units":high["unitsObserved"]})
        except Exception as exc:
            errors.append({"mapId":mid,"error":str(exc)[:300]})
            check(f"map {mid} navigation",False,str(exc)[:240])
    browser.close()
out={"source":"https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban",
"edition":"CURRENT_VNG_MOBILE","checks":checks,"errors":errors,
"status":"PASS" if checks and all(v["pass"] for v in checks) else "FAIL"}
Path("group02-critical-qa.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
if out["status"]!="PASS":raise SystemExit("Live Wiki critical QA failed")
