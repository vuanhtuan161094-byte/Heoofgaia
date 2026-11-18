#!/usr/bin/env python3
"""Public VNG Mobile Wiki dungeon facts only: no artwork, reports or copied descriptions."""
import argparse,json,re,time
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import parse_qs,urlsplit
from playwright.sync_api import sync_playwright
BASE="https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban"
def number(v):
    return int(re.sub(r"\D","",str(v))) if v is not None and re.search(r"\d",str(v)) else None
def search(s,pattern):
    m=re.search(pattern,s,re.I|re.S)
    return m.group(1).strip() if m else None
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
def get_npc_links(page,info):
    page.goto(info["url"],wait_until="domcontentloaded",timeout=60000)
    page.wait_for_timeout(800);found={};warnings=[]
    t=page.locator("body").inner_text()
    detail_count=search(t,r"Thành Chính\s*\d+\s+(\d+)\s*NPC")
    if detail_count:info["detailDeclaredNpcCount"]=number(detail_count)
    for _ in range(60):
        page.wait_for_timeout(300)
        for ref in anchors(page,True):
            q=parse_qs(urlsplit(ref["url"]).query)
            if number(q.get("map",[None])[0])==info["mapId"]:
                found[number(q.get("ai",[None])[0])]=ref
        if info["advertisedNpcCount"] is not None and len(found)>=info.get("detailDeclaredNpcCount",info["advertisedNpcCount"]):break
        controls=page.get_by_role("button",name=re.compile(r"^Sau\s*›?$"))
        if not controls.count() or not controls.last.is_enabled():break
        before=page.locator("body").inner_text()[-600:]
        try:controls.last.click(timeout=7500);page.wait_for_timeout(400)
        except Exception as ex:warnings.append(str(ex)[:140]);break
        if before==page.locator("body").inner_text()[-600:]:break
    return [v for k,v in sorted(found.items()) if k is not None],warnings
def get_unit(page):
    t=page.locator("body").inner_text().split("Đơn vị\n",1)[-1].split("Chiến Báo Gợi Ý",1)[0]
    return {"slot":number(search(t,r"Vị trí\s*(\d+)")),
      "level":number(search(t,r"Vị trí\s*\d+\s*[·•]\s*Cấp\s*(\d+)")),
      "soldiers":number(search(t,r"Vị trí[^\n]*?(\d[\d,]*)\s*quân")),
      "skillName":search(t,r"Kỹ năng chủ động\s*\([^)]+\)\s*\n\s*([^\n]+)")}
def get_npc(page,link):
    page.goto(link["url"],wait_until="domcontentloaded",timeout=60000)
    page.wait_for_timeout(850)
    t=page.locator("body").inner_text();u=get_unit(page)
    observed={u["slot"]:u} if u["slot"] is not None else {}
    try:
        a=page.get_by_text("Đội hình",exact=True).first.bounding_box(timeout=1500)
        b=page.get_by_text("Bấm vào một đơn vị",exact=False).first.bounding_box(timeout=1500)
        if a and b:
            imgs=page.locator("img[alt]")
            for i in range(min(25,imgs.count())):
                el=imgs.nth(i);rect=el.bounding_box(timeout=1200)
                if rect and a["y"]<rect["y"]<b["y"]:
                    try:
                        el.click(timeout=1300);page.wait_for_timeout(80);x=get_unit(page)
                        if x["slot"] is not None:observed[x["slot"]]=x
                    except Exception:pass
    except Exception:pass
    return {"aiId":number(parse_qs(urlsplit(link["url"]).query).get("ai",[None])[0]),
      "name":search(t,r"\n([^\n]+)\n(?:BOSS|Thường|Quân đoàn)\n"),
      "kind":search(t,r"\n(BOSS|Thường|Quân đoàn)\n"),
      "level":number(search(t,r"\nCấp\s*(\d+)")),
      "totalSoldiers":number(search(t,r"Tổng quân\s*([\d,.]+)")),
      "attackCoefficientShown":number(search(t,r"Hệ số công\s*\??\s*([\d,.]+)")),
      "unitsObserved":[observed[k] for k in sorted(observed)],
      "fullTeamVerified":False,"fullTeamStatus":"UNKNOWN",
      "url":link["url"],"version":"VNG_MOBILE"}
def main(opts):
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
                    except Exception as ex:row.setdefault("npcErrors",[]).append({"url":item["url"],"error":str(ex)[:200]})
                    time.sleep(max(.5,opts.delay))
                row["npcListComplete"]=len(row["npcs"])==m.get("detailDeclaredNpcCount",m["advertisedNpcCount"]) and not notes and not row.get("npcErrors")
            except Exception as ex:failures.append({"mapId":m["mapId"],"error":str(ex)[:200]})
            records.append(row)
            opts.output.write_text(json.dumps({"indexCount":len(allmaps),"sourceUrl":BASE,"scope":"CURRENT_VNG_MOBILE",
              "checkedAt":datetime.now(timezone.utc).isoformat(),"maps":records,"errors":failures,"shard":opts.shard},
              ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
            if i%5==0:print("shard",opts.shard,i+1,"of",len(selected),flush=True)
        browser.close()
if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--shard",type=int,default=0)
    ap.add_argument("--shards",type=int,default=8)
    ap.add_argument("--delay",type=float,default=.8)
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args()
    if not 0<=args.shard<args.shards:ap.error("invalid shard")
    args.output.parent.mkdir(parents=True,exist_ok=True)
    main(args)
