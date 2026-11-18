#!/usr/bin/env python3
"""Read public NPC roster in the source's own order, each visible unit and traceable facts; no runtime import."""
import argparse,json,re,time
from decimal import Decimal,InvalidOperation
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import parse_qs,urlsplit
BASE="https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban"
def number(v):
    return int(re.sub(r"\D","",str(v))) if v is not None and re.search(r"\d",str(v)) else None
def search(s,pattern):
    m=re.search(pattern,s,re.I|re.S)
    return m.group(1).strip() if m else None
def army_count(raw):
    """Read 263.1 triệu as 263100000, never the misleading 2631."""
    if raw is None:
        return None
    value=str(raw).strip().lower().replace("\u00a0"," ")
    # Optional suffix after a greedy digit class can silently match nothing.
    # Prefer a mandatory known unit before falling back to grouped integers.
    m=re.match(r"(\d[\d.,\s]*?)\s*(tỷ|tỉ|triệu|nghìn|ngàn|vạn)\b",value)
    if m:
        figures=m.group(1).replace(" ","")
        scale=m.group(2)
    else:
        m=re.match(r"(\d[\d.,\s]*)",value)
        if not m:return None
        figures=m.group(1).replace(" ","")
        scale=None
    if scale:
        factor={"tỷ":1000000000,"tỉ":1000000000,"triệu":1000000,
                "nghìn":1000,"ngàn":1000,"vạn":10000}[scale]
        if "," in figures and "." in figures:
            figures=figures.replace(",","") if figures.rfind(".")>figures.rfind(",") else figures.replace(".","").replace(",",".")
        elif "," in figures:
            figures=figures.replace(",",".")
        try:quantity=Decimal(figures)*factor
        except InvalidOperation:return None
        return int(quantity) if quantity==quantity.to_integral_value() else None
    if not re.fullmatch(r"\d+(?:[.,]\d{3})*",figures):
        return None
    return int(re.sub(r"[.,]","",figures))


def short_map_rules(page_text,map_url):
    """Only compact facts about explicit map-wide effects; never borrow unit skill text."""
    match=re.search(r"(?:LUẬT CHIẾN ĐẤU|QUY TẮC CHIẾN ĐẤU|HIỆU ỨNG PHÓ BẢN)\s*(.*?)(?=DANH SÁCH NPC)",page_text,re.I|re.S)
    if not match:
        return []
    result=[]
    for line in match.group(1).splitlines():
        line=line.strip()
        if len(line)>100 or not line:
            continue
        match_effect=re.search(r"(?:(Phe (?:ta|địch))\s*)?([-+]\s*\d+(?:[.,]\d+)?\s*%)?\s*(trúng\s*)?(Đóng Băng|Mê Hoặc|Tan Vỡ|Hư Nhược|sát thương|phòng thủ|sĩ khí)",line,re.I)
        if match_effect:
            result.append({"affectedTeam":match_effect.group(1),"modifier":match_effect.group(2).replace(" ","") if match_effect.group(2) else None,
                "effectType":match_effect.group(4),"skillSourceType":"DUNGEON_WIDE_RULE","sourceUrl":map_url,"classification":"VERIFIED"})
    return result


def anchors(page,individual=False):
    return page.evaluate("""kind => [...document.querySelectorAll('a[href*="map="]')].map(a=>({url:a.href,text:(a.innerText||'').trim()})).filter(x=>{let u=new URL(x.url),p=u.searchParams;return u.pathname.endsWith('/pho-ban-chi-tiet')&&p.has('map')&&p.has('ai')===kind})""",individual)
def get_index(page):
    page.goto(BASE,wait_until="domcontentloaded",timeout=60000)
    for _ in range(8):
        page.wait_for_timeout(1200)
        links=anchors(page)
        if len(links)>=200:break
    out={}
    for link in links:
        url=link["url"];s=link["text"];mapid=number(parse_qs(urlsplit(url).query).get("map",[None])[0])
        if mapid is None:continue
        m=re.search(r"Cấp\s*(\d+)\s*TC\s*(\d+)\s*(\d+)\s*NPC",s)
        before=s.split("Cấp",1)[0]
        name=before.split("Thế lực",1)[0]
        for w in ("VN","CN","Mới","Có CB"):name=name.replace(w,"")
        city=int(m[2]) if m else None
        count=int(m[3]) if m else None
        if m and (city>425 or count==0):
            digits=m[2]+m[3]
            valid=set([20,40,60,80,100,110,120,130,140,150,155,160,165,170,175,180,185,190,195,200,205,210,215,220,225,230,235,240,245,250,255,260,265,270,275,280,285,290,295,300,305,310,315,320,325,330,335,340,345,350,355,360,365,370,375,380,385,390,395,400,405,410,415,420,425])
            options=[(v,int(digits[len(str(v)):])) for v in valid if digits.startswith(str(v)) and digits[len(str(v)):] and 1<=int(digits[len(str(v)):])<=80]
            if options:city,count=max(options,key=lambda item:len(str(item[0])))
            else:city,count=None,None
        out[mapid]={"mapId":mapid,"name":name.strip(" ·\n▾") or None,
          "faction":search(before,r"Thế lực\s*([^·\n]+?)(?:Có CB|\s*$)"),
          "level":int(m[1]) if m else None,"cityLevel":city,
          "advertisedNpcCount":count,"url":url,
          "provenance":"VERIFIED_INDEX","version":"VNG_MOBILE"}
    return [out[k] for k in sorted(out)]
def npc_index_entry(link, mapid):
    q=parse_qs(urlsplit(link["url"]).query)
    ai=number(q.get("ai",[None])[0])
    if ai is None or number(q.get("map",[None])[0])!=mapid:
        return None
    parts=[x.strip() for x in link.get("text","").splitlines() if x.strip()]
    order=int(parts[0]) if parts and parts[0].isdigit() else None
    name=parts[1] if len(parts)>1 else None
    kind=parts[2] if len(parts)>2 else None
    level=number(search(link.get("text",""),r"Cấp\s*(\d+)"))
    army=army_count(search(link.get("text",""),r"Cấp\s*\d+\s*[·•]\s*([\d,.]+\s*(?:tỷ|tỉ|triệu|nghìn|ngàn|vạn)?)\s*quân"))
    merit=number(search(link.get("text",""),r"Chiến công\s*([\d,.]+)"))
    return dict(aiId=ai,listOrder=order,name=name,kind=kind,level=level,
      totalSoldiers=army,merit=merit,url=link["url"],
      summarySourceUrl="https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban-chi-tiet?map="+str(mapid))


def get_npc_links(page,info):
    page.goto(info["url"],wait_until="domcontentloaded",timeout=60000)
    found={};warnings=[];loaded=False
    for attempt in range(3):
        try:
            page.locator("a[data-nlw-camp-ai]").first.wait_for(timeout=5500,state="attached")
            loaded=True;break
        except Exception:
            if attempt<2:
                page.reload(wait_until="domcontentloaded",timeout=60000)
                page.wait_for_timeout(900)
    if not loaded:
        warnings.append("NPC_LIST_NOT_RENDERED_AFTER_3_ATTEMPTS")
        return [],warnings
    intro=page.locator("body").inner_text()
    info["mapWideRulesObserved"]=short_map_rules(intro,info["url"])
    advertised=search(intro,r"\n(\d+)\s*NPC\s*\nDANH SÁCH NPC")
    if advertised is not None:info["detailDeclaredNpcCount"]=int(advertised)
    if info.get("advertisedNpcCount") is not None and info.get("detailDeclaredNpcCount") is not None and info["advertisedNpcCount"]!=info["detailDeclaredNpcCount"]:
        info["npcCountIndexVsDetailMismatch"]=True
    for _ in range(80):
        page.wait_for_timeout(180)
        current=[]
        for link in anchors(page,True):
            item=npc_index_entry(link,info["mapId"])
            if item:
                current.append(item)
                found[item["aiId"]]=item
        expected=info.get("detailDeclaredNpcCount") or info.get("advertisedNpcCount")
        if expected is not None and len(found)>=expected:break
        controls=page.locator('button[data-nlw-camp-trang="1"]')
        if not controls.count() or not controls.last.is_enabled():break
        before=tuple(x["aiId"] for x in current)
        try:
            controls.last.click(timeout=7000)
            page.wait_for_timeout(380)
        except Exception as ex:
            warnings.append("PAGINATION_CLICK_FAILED:"+str(ex)[:140]);break
        next_page=[]
        for link in anchors(page,True):
            item=npc_index_entry(link,info["mapId"])
            if item:next_page.append(item["aiId"])
        if before==tuple(next_page):
            warnings.append("PAGINATION_DID_NOT_ADVANCE");break
    items=list(found.values())
    if all(isinstance(x.get("listOrder"),int) for x in items):
        items.sort(key=lambda x:x["listOrder"])
    else:
        warnings.append("LIST_ORDER_PARTIAL")
    if not items:
        warnings.append("NO_NPC_INDEX_ROWS")
    expected=info.get("detailDeclaredNpcCount") or info.get("advertisedNpcCount")
    if expected is not None and len(items)!=expected:
        warnings.append("NPC_COUNT_MISMATCH:"+str(len(items))+"/"+str(expected))
    return items,warnings

def get_unit(page):
    t=page.locator("body").inner_text()
    section=t.split("\nĐƠN VỊ\n",1)[-1].split("\nCHIẾN BÁO GỢI Ý",1)[0]
    slot=number(search(section,r"Vị trí\s*(\d+)"))
    name=search(section,r"^\s*([^\n]+)\s*\n\s*Vị trí\s*\d+")
    troop=page.evaluate("""() => {
        const b=document.querySelector('button[data-nlw-unit]');
        if(!b)return null;
        const pic=b.querySelector('img[alt]');
        return {wikiTroopId:b.getAttribute('data-nlw-unit'),
                imageAlt:pic?.getAttribute('alt')||null,
                label:(b.innerText||'').replace(/Xem chi tiết Binh Chủng.*/s,'').trim()};
    }""")
    skill_name=search(section,r"KỸ NĂNG CHỦ ĐỘNG\s*\([^)]+\)\s*\n\s*([^\n]+)")
    skill_info=search(section,r"KỸ NĂNG CHỦ ĐỘNG\s*\([^)]+\)\s*\n[^\n]*\n\s*([^\n]+)")
    return {"slot":slot,"name":name,
      "level":number(search(section,r"Vị trí\s*\d+\s*[·•]\s*Cấp\s*(\d+)")),
      "soldiers":army_count(search(section,r"Vị trí[^\n]*?([\d,.]+\s*(?:tỷ|tỉ|triệu|nghìn|ngàn|vạn)?)\s*quân")),
      "troopWikiId":number(troop.get("wikiTroopId")) if troop else None,
      "troopName":troop.get("imageAlt") if troop else None,
      "troopLabel":troop.get("label") if troop else None,
      "skillName":skill_name,
      "skillSourceType":"NPC_UNIT_ACTIVE" if skill_name else None,
      "skillNamespace":"NPC_EXCLUSIVE_LABEL" if skill_name and re.search(r"\[\s*NPC\s*\]",skill_name,re.I) else ("WIKI_HERO_ACTIVE" if skill_name else None),
      "skillLevelShown":number(search(skill_name,r"Cấp\s*(\d+)")) if skill_name else None,
      "skillVersion":"CURRENT_WIKI_UNDATED",
      "skillHistoricalOrigin":"UNKNOWN",
      "passiveSkillNames":None,
      "lordSkillNames":None,
      "troopSkillNames":None,
      "skillDescriptionDigestOnly":None,
      "criticalPercent":number(search(section,r"Bạo kích\s*([\d,.]+)%")),
      "counterattackPercent":number(search(section,r"Phản kích\s*([\d,.]+)%"))}

def get_npc(page,link):
    page.goto(link["url"],wait_until="domcontentloaded",timeout=60000)
    page.locator('button[data-nlw-camp-o^="npc:"]').first.wait_for(state="attached",timeout=15000)
    page.wait_for_timeout(280)
    text=page.locator("body").inner_text()
    named_slots=page.locator('button[data-nlw-camp-o^="npc:"]').evaluate_all(
      "els => els.map(e=>({slot:Number(e.getAttribute('data-nlw-camp-o').split(':')[1]),name:(e.innerText||'').trim()}))")
    expected_slots=[x["slot"] for x in named_slots]
    if any(not isinstance(slot,int) or slot<1 or slot>9 for slot in expected_slots):
        raise RuntimeError("Wiki NPC formation slot out of 1..9")
    if len(expected_slots)!=len(set(expected_slots)):
        raise RuntimeError("Wiki NPC formation has duplicated occupied slots")
    observed={};errors=[]
    for record in named_slots:
        slot=record["slot"]
        try:
            page.locator('button[data-nlw-camp-o="npc:'+str(slot)+'"]').click(timeout=5000)
            page.wait_for_timeout(110)
            unit=get_unit(page)
            if unit.get("slot")!=slot:
                errors.append("SELECTED_SLOT_DID_NOT_CHANGE:"+str(slot))
                continue
            if unit.get("name") is None:
                unit["name"]=record["name"] or None
            observed[slot]=unit
        except Exception as e:
            errors.append("SLOT_READ_FAILED:"+str(slot)+":"+str(e)[:100])
    units=[observed[k] for k in sorted(observed)]
    total=army_count(search(text,r"Tổng quân\s*([\d,.]+\s*(?:tỷ|tỉ|triệu|nghìn|ngàn|vạn)?)"))
    if total is None:total=link.get("totalSoldiers")
    full_team=len(observed)==len(expected_slots) and bool(expected_slots) and not errors
    known_soldiers=full_team and all(x.get("soldiers") is not None for x in units)
    unit_sum=sum(x["soldiers"] for x in units) if known_soldiers else None
    discrepancy=(total-unit_sum) if total is not None and unit_sum is not None else None
    sum_valid=(discrepancy==0) if discrepancy is not None else None
    soldier_consistency=("MATCH" if discrepancy==0 else "SOURCE_MISMATCH") if discrepancy is not None else "UNKNOWN"
    return {"aiId":link["aiId"],"listOrder":link.get("listOrder"),
      "name":link.get("name") or search(text,r"\n([^\n]+)\n(?:BOSS|TINH NHUỆ|THƯỜNG|QUÂN ĐOÀN)\n"),
      "kind":link.get("kind"),"level":link.get("level") or number(search(text,r"\nCấp\s*(\d+)")),
      "totalSoldiers":total,"merit":link.get("merit"),
      "attackCoefficientShown":number(search(text,r"Hệ số công\s*\??\s*([\d,.]+)")),
      "firstMoverObserved":search(text,r"Ra tay trước\s*\??\s*(Đội bạn|NPC|Địch)"),
      "npcLordSkills":None,"npcPassiveSkills":None,
      "npcStageSkills":None,"npcSoulBeastEffects":None,
      "formationDeclaredUnitCount":len(expected_slots),"formationOccupiedSlots":sorted(expected_slots),
      "selectedUnitCount":len(units),"unitsObserved":units,
      "unitSoldierSumValid":sum_valid,"unitSoldierDiscrepancy":discrepancy,
      "unitSoldierConsistencyStatus":soldier_consistency,
      "fullTeamVerified":full_team,
      "fullTeamStatus":"VERIFIED" if full_team else "UNKNOWN",
      "unitErrors":errors,"url":link["url"],"npcListSourceUrl":link["summarySourceUrl"],
      "edition":"CURRENT_VNG_MOBILE","detailReadStatus":"READ","version":"VNG_MOBILE"}


def npc_stub(link,error):
    return {"aiId":link["aiId"],"listOrder":link.get("listOrder"),
      "name":link.get("name"),"kind":link.get("kind"),"level":link.get("level"),
      "totalSoldiers":link.get("totalSoldiers"),"merit":link.get("merit"),
      "attackCoefficientShown":None,"unitsObserved":[],
      "formationDeclaredUnitCount":None,"formationOccupiedSlots":None,
      "selectedUnitCount":0,"unitSoldierSumValid":None,
      "unitSoldierDiscrepancy":None,"unitSoldierConsistencyStatus":"UNKNOWN",
      "fullTeamVerified":False,"fullTeamStatus":"UNKNOWN",
      "url":link["url"],"npcListSourceUrl":link["summarySourceUrl"],
      "detailReadStatus":"FAILED","error":error[:180],"edition":"CURRENT_VNG_MOBILE"}

def main(opts):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=["--no-sandbox"])
        page=browser.new_page(viewport={"width":1280,"height":720})
        allmaps=get_index(page)
        if len(allmaps)<200:raise RuntimeError("Only %s maps visible; do not claim complete index"%len(allmaps))
        selected=[m for i,m in enumerate(allmaps) if i%opts.shards==opts.shard]
        records=[];failures=[]
        for i,m in enumerate(selected):
            row=dict(m,npcs=[],npcListComplete=False)
            try:
                urls,notes=get_npc_links(page,m);row["paginationNotes"]=notes
                for item in urls:
                    try:row["npcs"].append(get_npc(page,item))
                    except Exception as ex:
                        row.setdefault("npcErrors",[]).append({"url":item["url"],"error":str(ex)[:200]})
                        row["npcs"].append(npc_stub(item,str(ex)))
                    time.sleep(max(.5,opts.delay))
                row["npcListComplete"]=len(row["npcs"])==m.get("detailDeclaredNpcCount",m["advertisedNpcCount"]) and not notes
                row["npcDetailReadCount"]=sum(x.get("detailReadStatus")=="READ" for x in row["npcs"])
                row["npcFormationsFullyEnumeratedCount"]=sum(x.get("fullTeamVerified") is True for x in row["npcs"])
                row["npcFullSoldierSummationCount"]=sum(x.get("unitSoldierSumValid") is True for x in row["npcs"])
                row["npcDetailComplete"]=row["npcListComplete"] and row["npcDetailReadCount"]==len(row["npcs"]) and all(x.get("fullTeamVerified") for x in row["npcs"])
            except Exception as ex:failures.append({"mapId":m["mapId"],"error":str(ex)[:200]})
            records.append(row)
            opts.output.write_text(json.dumps({"indexCount":len(allmaps),"sourceUrl":BASE,"scope":"CURRENT_VNG_MOBILE",
              "checkedAt":datetime.now(timezone.utc).isoformat(),"maps":records,"errors":failures,"shard":opts.shard},
              ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
            if i%5==0:print("shard",opts.shard,i+1,"of",len(selected),flush=True)
        browser.close()
def self_test():
    assert army_count("263.1 triệu") == 263100000
    assert army_count("263,1 triệu") == 263100000
    assert army_count("1,300") == 1300
    assert army_count("500,000") == 500000
    assert army_count("1.5 tỷ") == 1500000000
    assert army_count("—") is None
    source={"url":"https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban-chi-tiet?map=3&ai=108&side=vn",
      "text":"1\nĐột Kích 1\nTHƯỜNG\nCấp 20 · Chiến công 100\n›"}
    item=npc_index_entry(source,3)
    assert item["listOrder"]==1 and item["name"]=="Đột Kích 1" and item["aiId"]==108
    rich={"url":"https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban-chi-tiet?map=269&ai=7731&side=vn",
      "text":"1\nƯng Nhãn Thần Xạ 1\nTHƯỜNG\nCấp 371 · 263.1 triệu quân · Chiến công 1,665\n›"}
    x=npc_index_entry(rich,269)
    assert x["totalSoldiers"]==263100000 and x["merit"]==1665
    print("PASS: locale army quantities, paginated NPC summary links and historical-scale soldiers")


if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--self-test",action="store_true")
    ap.add_argument("--shard",type=int,default=0)
    ap.add_argument("--shards",type=int,default=8)
    ap.add_argument("--delay",type=float,default=.8)
    ap.add_argument("--output",type=Path)
    args=ap.parse_args()
    if args.self_test:
        self_test()
        raise SystemExit(0)
    if not 0<=args.shard<args.shards:ap.error("invalid shard")
    if args.output is None:ap.error("--output required unless --self-test")
    args.output.parent.mkdir(parents=True,exist_ok=True)
    main(args)
