#!/usr/bin/env python3
"""Read factual map, NPC, 3x3 unit and skill metadata from VNG's *public* per-map JSON.

The project is independent. Do not copy proprietary art, full skill descriptions,
player battle reports, game code or internal formulas. The data is VNG Mobile,
not verified classic webgame rules. All outputs are reference-only.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

CDN = "https://cdn-mainsite-aka.vnggames.com/products/mwly/landing/2026-ngoa-long-wiki-clone/data/campaign"
WIKI = "https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban-chi-tiet"
AGENT = "Mozilla/5.0 (compatible; NgọaLongWikiReferenceResearch/1.0)"
CLASS = ("VERIFIED", "DERIVED", "UNKNOWN")

def short(value, max_len=115):
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value if value and len(value) <= max_len else None

def integer(value):
    if type(value) is int:
        return value
    if isinstance(value, str) and re.fullmatch(r"\d+",value):
        return int(value)
    return None

def status(value, derived=False):
    return "UNKNOWN" if value is None else "DERIVED" if derived else "VERIFIED"

def marker(value):
    if isinstance(value, dict):
        return {"id": short(str(value.get("id"))) if value.get("id") is not None else None,
                "name": short(value.get("name")),
                "sourceType": "UNIT_EFFECT_LABEL"}
    if isinstance(value, str):
        return {"id": None, "name": short(value), "sourceType": "EFFECT_LABEL"}
    return {"id": None, "name": None, "sourceType": "UNKNOWN"}

def unit(record, source_url):
    if not isinstance(record, dict):
        raise ValueError("Formation unit is not an object")
    pos=integer(record.get("pos"))
    if pos is None or not 1<=pos<=9:
        raise ValueError("Missing/invalid source position 1..9")
    skill=record.get("activeSkill")
    if not isinstance(skill, dict):
        skill={}
    skill_name=short(skill.get("name"))
    soldier=integer(record.get("hp"))
    if soldier is not None and soldier<0:
        raise ValueError("Negative source HP/soldier count")
    level=integer(record.get("level"))
    troop_id=short(str(record.get("soldierId"))) if record.get("soldierId") is not None else None
    name=short(record.get("general"))
    return {
        "wikiSlot":pos,
        "formationSlot":pos-1,
        "generalName":name,
        "troopWikiId":troop_id,
        "troopName":None,
        "soldiersRaw":soldier,
        "soldiersSourceField":"formation.hp",
        "unitLevel":level,
        "activeSkillName":skill_name,
        "activeSkillLevel":integer(skill.get("level")),
        "activeSkillClass":"NPC_HERO_ACTIVE",
        "npcExclusiveLabel":bool(skill_name and re.search(r"\[\s*NPC\s*\]",skill_name,re.I)),
        "activeSkillDescriptionSha256":hashlib.sha256(skill["desc"].encode()).hexdigest() if isinstance(skill.get("desc"),str) else None,
        "activeSkillDescriptionImported":False,
        "unitEffects":[marker(e) for e in record.get("effects",[]) if isinstance(e,(dict,str))],
        "passiveSkillNames":None,
        "lordSkillNames":None,
        "sourceUrl":source_url,
        "fieldStatus":{
            "wikiSlot":"VERIFIED","formationSlot":"DERIVED",
            "generalName":status(name),"troopWikiId":status(troop_id),
            "troopName":"UNKNOWN","soldiersRaw":status(soldier),
            "unitLevel":status(level),"activeSkillName":status(skill_name),
            "activeSkillLevel":status(integer(skill.get("level"))),
            "unitEffects":"VERIFIED"
        },
    }

def npc(record, order, map_id, side):
    if not isinstance(record,dict):
        raise ValueError("NPC not an object")
    ident=integer(record.get("ident"))
    if ident is None:
        raise ValueError("NPC lacks official ident")
    url=f"{WIKI}?map={map_id}&ai={ident}&side={side}"
    raw=record.get("formation") or []
    if not isinstance(raw,list):
        raise ValueError(f"NPC {ident} formation not an array")
    rows=[unit(x,url) for x in raw]
    slots=[u["wikiSlot"] for u in rows]
    if len(slots)!=len(set(slots)):
        raise ValueError(f"NPC {ident} repeats a 3x3 slot")
    troops=integer(record.get("troops"))
    if troops is not None and troops<0:
        raise ValueError(f"NPC {ident} has negative troops")
    complete=bool(rows and all(u["soldiersRaw"] is not None for u in rows))
    observed=sum(u["soldiersRaw"] for u in rows) if complete else None
    delta=troops-observed if troops is not None and observed is not None else None
    status_sum=("MATCH" if delta==0 else "SOURCE_MISMATCH") if delta is not None else "UNKNOWN"
    rows.sort(key=lambda x:x["wikiSlot"])
    name=short(record.get("name"))
    kind=short(record.get("type"))
    return {
        "wikiAiId":ident, "listOrder":order, "name":name,"kind":kind,
        "level":integer(record.get("level")),
        "totalSoldiersRaw":troops,
        "totalSoldiersSourceField":"npc.troops",
        "formationSoldiersSumRaw":observed,
        "unitSoldierDiscrepancyRaw":delta,
        "unitSoldierConsistencyStatus":status_sum,
        "powerShown":integer(record.get("power")),
        "merit":integer(record.get("merit")),
        "fastAttack":record.get("fastAttack") if isinstance(record.get("fastAttack"),bool) else None,
        "qtyLimit":integer(record.get("qtyLimit")),
        "formation":rows,
        "formationOccupiedSlots":[u["wikiSlot"] for u in rows],
        "formationComplete":bool(rows),
        "npcEffects":[marker(x) for x in record.get("effects",[]) if isinstance(x,(str,dict))],
        "soulModifiers":[{"name":short(x.get("name")), "value":x.get("value") if isinstance(x.get("value"),(int,float)) else None} for x in record.get("souls",[]) if isinstance(x,dict)],
        "drops":[{"wikiItemId":integer(x.get("id")),"name":short(x.get("name")),"rate":x.get("rate") if isinstance(x.get("rate"),(int,float)) else None,
                  "category":short(x.get("category"))}
                 for x in record.get("drops",[]) if isinstance(x,dict)],
        "lordSkillNames":None,
        "npcPassiveSkillNames":None,
        "patchClassification":"CURRENT_MOBILE_SNAPSHOT_UNDATED",
        "sourceUrl":url,
        "sourceMapJson":f"{CDN}/{map_id}.json",
        "fieldStatus":{
            "wikiAiId":"VERIFIED","listOrder":"DERIVED","name":status(name),"kind":status(kind),
            "level":status(integer(record.get("level"))),"totalSoldiersRaw":status(troops),
            "formation":"VERIFIED","formationSoldiersSumRaw":status(observed,True),
            "unitSoldierDiscrepancyRaw":status(delta,True),
            "npcEffects":"VERIFIED","soulModifiers":"VERIFIED","lordSkillNames":"UNKNOWN",
            "npcPassiveSkillNames":"UNKNOWN","patchClassification":"DERIVED"
        }
    }

def tiny_reward(row):
    if not isinstance(row,dict):
        return None
    return {"name":short(row.get("name")),"amount":integer(row.get("amount")),
            "wikiItemId":integer(row.get("id"))}

def map_data(raw,map_id,side,index_record):
    if not isinstance(raw,dict):
        raise ValueError(f"Map {map_id} root not object")
    view=raw.get(side)
    if not isinstance(view,dict):
        raise ValueError(f"Map {map_id}/{side} section missing")
    npc_raw=view.get("npcs")
    if not isinstance(npc_raw,list):
        raise ValueError(f"Map {map_id}/{side} NPC array missing")
    seen=set();NPCs=[]
    for order,value in enumerate(npc_raw,1):
        n=npc(value,order,map_id,side)
        if n["wikiAiId"] in seen:
            raise ValueError(f"Map {map_id}/{side} duplicate NPC {n['wikiAiId']}")
        seen.add(n["wikiAiId"])
        NPCs.append(n)
    page=f"{WIKI}?map={map_id}&side={side}"
    source=f"{CDN}/{map_id}.json"
    buffs=[marker(v) for v in view.get("buffs",[]) if isinstance(v,(str,dict))]
    known_count=integer(view.get("npcCount"))
    top_count=integer(raw.get("npcCount"))
    classification={"isMain":bool(raw.get("isMain")),
                    "isSub":bool(raw.get("isSub")),
                    "isHard":bool(raw.get("hard")),
                    "isHidden":bool(raw.get("isHidden")),
                    "sideLabel":short(raw.get("side"))}
    return {
        "wikiMapId":map_id,"sourceEdition":"VNG_MOBILE_"+side.upper(),
        "name":short(raw.get("name")),"subLabel":short(raw.get("sub")),
        "mapLevel":integer(view.get("mapLevel")) if integer(view.get("mapLevel")) is not None else integer(raw.get("mapLevel")),
        "unlockCityLevel":integer(view.get("unlockLevel")) if integer(view.get("unlockLevel")) is not None else integer(raw.get("unlockLevel")),
        "classification":classification,
        "wikiDeclaredNpcCountSide":known_count,
        "wikiDeclaredNpcCountRoot":top_count,
        "npcRecordsCount":len(NPCs),
        "npcRosterComplete":known_count is not None and known_count==len(NPCs),
        "mapWideBuffLabels":buffs,
        "mainlineTroopRuleOverrides":None,
        "rewards":[v for x in view.get("rewards",[]) if (v:=tiny_reward(x)) is not None],
        "achievements":[v for x in view.get("thanhTuu",[]) if (v:=tiny_reward(x)) is not None],
        "npcs":NPCs,
        "sourceUrl":page, "sourceMapJson":source,
        "sourceOriginalTitle":short(index_record.get("name")),
        "sourceIndexListedCount":integer(index_record.get("advertisedNpcCount")),
        "sourceIndexNameMatches":short(index_record.get("name"))==short(raw.get("name")),
        "fieldStatus":{
            "name":status(short(raw.get("name"))),
            "classification":"VERIFIED","mapLevel":"VERIFIED",
            "unlockCityLevel":"VERIFIED","wikiDeclaredNpcCountSide":status(known_count),
            "npcRecordsCount":"DERIVED","npcRosterComplete":"DERIVED",
            "mapWideBuffLabels":"VERIFIED","mainlineTroopRuleOverrides":"UNKNOWN"
        },
    }

def compatibility(record):
    result=[]
    for m in record:
        rows=[]
        for n in m["npcs"]:
            units=[{"slot":u["wikiSlot"],"name":u["generalName"],"soldiers":u["soldiersRaw"],"level":u["unitLevel"],
                    "troopWikiId":u["troopWikiId"],"troopName":None,
                    "skillName":u["activeSkillName"],"skillSourceType":"NPC_UNIT_ACTIVE" if u["activeSkillName"] else None,
                    "skillNamespace":"NPC_EXCLUSIVE_LABEL" if u["npcExclusiveLabel"] else ("WIKI_HERO_ACTIVE" if u["activeSkillName"] else None),
                    "skillLevelShown":u["activeSkillLevel"],
                    "skillVersion":"CURRENT_WIKI_UNDATED"} for u in n["formation"]]
            rows.append({"aiId":n["wikiAiId"],"listOrder":n["listOrder"],
                "name":n["name"],"kind":n["kind"],"level":n["level"],
                "totalSoldiers":n["totalSoldiersRaw"],"merit":n["merit"],
                "attackCoefficientShown":n["powerShown"],"unitsObserved":units,
                "formationDeclaredUnitCount":len(units),
                "formationOccupiedSlots":n["formationOccupiedSlots"],
                "fullTeamVerified":n["formationComplete"],"unitSoldierDiscrepancy":n["unitSoldierDiscrepancyRaw"],
                "detailReadStatus":"PUBLIC_OFFICIAL_JSON","url":n["sourceUrl"],"sourceMapJson":n["sourceMapJson"]})
        result.append({"mapId":m["wikiMapId"],"name":m["name"],"faction":None,
            "level":m["mapLevel"],"cityLevel":m["unlockCityLevel"],
            "advertisedNpcCount":m["wikiDeclaredNpcCountSide"],
            "npcListComplete":m["npcRosterComplete"],"npcDetailComplete":False,
            "url":m["sourceUrl"],"npcs":rows,
            "classification":m["classification"],"mapWideRulesObserved":[],
            "sourceMapJson":m["sourceMapJson"]})
    return {"schemaVersion":1,"edition":"CURRENT_VNG_MOBILE","runtimeAuthority":False,
        "source":"PUBLIC_OFFICIAL_PER_MAP_JSON","maps":result}

def fetch(map_id, retries=3):
    url=f"{CDN}/{map_id}.json"
    for attempt in range(retries):
        try:
            req=urllib.request.Request(url,headers={"User-Agent":AGENT})
            with urllib.request.urlopen(req,timeout=25) as response:
                data=response.read(25_000_000)
                if len(data)>=25_000_000:raise ValueError("Excessive source file")
            return json.loads(data),hashlib.sha256(data).hexdigest(),len(data)
        except (urllib.error.URLError,TimeoutError,ValueError,json.JSONDecodeError):
            if attempt==retries-1:raise
            time.sleep((attempt+1)*0.6)

def write(path,value):
    path=Path(path)
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

def build(index_source,output_dir):
    idx=json.loads(Path(index_source).read_text(encoding="utf-8"))
    if not isinstance(idx.get("maps"),list) or len(idx["maps"])<200:
        raise ValueError("Index reference must include >=200 map links")
    ref={x["mapId"]:x for x in idx["maps"] if isinstance(x,dict) and type(x.get("mapId")) is int}
    if len(ref)!=len(idx["maps"]):
        raise ValueError("Duplicate map ID in reference index")
    report={"source":CDN,"edition":"CURRENT_VNG_MOBILE","classicParity":"UNKNOWN","runtimeAuthority":False,
      "mapLinksRequested":len(ref),"mapsImported":0,"mapErrors":[],
      "sourceBytes":0,"sourceChecksums":{},
      "vn":{},"cn":{},"mapClassCounts":{},
      "sourceIndexVsDetailCountMismatch":[],"mapTitleMismatches":[]}
    vn=[];cn=[]
    for i,map_id in enumerate(sorted(ref),1):
        try:
            root,digest,size=fetch(map_id)
            v=map_data(root,map_id,"vn",ref[map_id])
            c=map_data(root,map_id,"cn",ref[map_id])
            vn.append(v);cn.append(c)
            report["sourceChecksums"][str(map_id)]=digest
            report["sourceBytes"]+=size
            if v["sourceIndexNameMatches"] is False:
                report["mapTitleMismatches"].append({"mapId":map_id,"sourceIndexName":v["sourceOriginalTitle"],"jsonName":v["name"]})
            if v["sourceIndexListedCount"] is not None and v["sourceIndexListedCount"]!=v["wikiDeclaredNpcCountSide"]:
                report["sourceIndexVsDetailCountMismatch"].append({"mapId":map_id,"index":v["sourceIndexListedCount"],"json":v["wikiDeclaredNpcCountSide"]})
            classification="HARD" if v["classification"]["isHard"] else "SIDE" if v["classification"]["isSub"] else "MAIN" if v["classification"]["isMain"] else "OTHER"
            report["mapClassCounts"][classification]=report["mapClassCounts"].get(classification,0)+1
        except Exception as e:
            report["mapErrors"].append({"mapId":map_id,"reason":type(e).__name__+":"+str(e)[:180]})
        if i%25==0:
            print("public JSON map import",i,"of",len(ref),"success",len(vn),flush=True)
    report["mapsImported"]=len(vn)
    for key,rows in (("vn",vn),("cn",cn)):
        NPC=[n for m in rows for n in m["npcs"]]
        allunits=[u for n in NPC for u in n["formation"]]
        report[key]={
            "maps":len(rows),"npcs":len(NPC),"formationUnits":len(allunits),
            "mapRostersFull":sum(m["npcRosterComplete"] for m in rows),
            "mapRostersIncomplete":sum(not m["npcRosterComplete"] for m in rows),
            "npcFormationsPresent":sum(n["formationComplete"] for n in NPC),
            "npcFormationMissing":sum(not n["formationComplete"] for n in NPC),
            "npcRawSoldierSumsMatching":sum(n["unitSoldierConsistencyStatus"]=="MATCH" for n in NPC),
            "npcRawSoldierSumsMismatch":sum(n["unitSoldierConsistencyStatus"]=="SOURCE_MISMATCH" for n in NPC),
            "npcRawSoldierSumsUnknown":sum(n["unitSoldierConsistencyStatus"]=="UNKNOWN" for n in NPC),
            "npcExclusiveActiveSkills":sum(u["npcExclusiveLabel"] for u in allunits),
            "npcActiveSkills":sum(bool(u["activeSkillName"]) for u in allunits),
            "mapWideBuffLabels":sum(len(m["mapWideBuffLabels"]) for m in rows),
        }
    report["status"]="COMPLETE_MAP_SOURCE_FILES" if len(vn)==len(ref) and all(not report[k]["mapRostersIncomplete"] for k in ("vn","cn")) else "PARTIAL_CHECK_REPORT"
    report["note"]="Complete source files mean all map JSON files loaded; not classic parity or gameplay-ready. Raw formation hp is exact, UI may be rounded; version-specific skills remain separate."
    resultdir=Path(output_dir)
    write(resultdir/"wiki_campaign_direct_vn.json",{"schemaVersion":1,"sourceEdition":"VNG_MOBILE_VN","runtimeAuthority":False,"maps":vn})
    write(resultdir/"wiki_campaign_direct_cn.json",{"schemaVersion":1,"sourceEdition":"VNG_MOBILE_CN","runtimeAuthority":False,"maps":cn})
    write(resultdir/"wiki_campaign_direct_compat.json",compatibility(vn))
    write(resultdir/"wiki_campaign_direct_report.json",report)
    write(resultdir/"wiki_campaign_direct_handoff.json",{
        "schemaVersion":1,"group":"02_WIKI_SYSTEMS","target":"GAMEPLAY_INTEGRATION",
        "referenceOnly":True,"sourceEdition":"VNG_MOBILE","classicParity":"UNKNOWN",
        "canonicalVnFile":"data/ngoalong/group02_wiki/wiki_campaign_direct_vn.json",
        "canonicalCnFile":"data/ngoalong/group02_wiki/wiki_campaign_direct_cn.json",
        "builderCompatibilityFile":"data/ngoalong/group02_wiki/wiki_campaign_direct_compat.json",
        "patchHistoryFile":"data/ngoalong/group02_wiki/dungeon_patch_history.json",
        "coverage":{k:report[k] for k in ("vn","cn")},
        "mandatoryIntegrationChecks":[
            "Do not apply Mobile active/passive/lord/NPC-only skills to classic rules without review",
            "Validate source map class MAIN/SIDE/HARD, npc order and 3x3 slot orientation",
            "Preserve exact source troop count and exact unit hp, never substitute rounded UI text",
            "Resolve troop IDs and skill mechanics against original project engine separately",
            "No runtime ingestion until Save v5, replay, idempotence and exact-SHA CI pass",
        ],
    })
    print(json.dumps({"status":report["status"],"maps":report["mapsImported"],"mainSideHard":report["mapClassCounts"],
                      "vn":report["vn"],"cn":report["cn"],"sourceErrors":len(report["mapErrors"])},ensure_ascii=False,flush=True)
    if report["status"]!="COMPLETE_MAP_SOURCE_FILES":
        raise ValueError("Not all referenced maps or source npc rosters are complete")

def self_test():
    src={"pos":3,"general":"Hoành Tảo Doanh","hp":220,"level":1,"soldierId":"10",
         "activeSkill":{"name":"Hoành Tảo","desc":"brief test","level":1},"effects":[]}
    n={"ident":82,"name":"Ba Tài","type":"BOSS","level":6,"troops":420,
       "formation":[src,dict(src,pos=5,general="Ba Tài",hp=200)]}
    out=npc(n,4,1,"vn")
    assert out["unitSoldierDiscrepancyRaw"]==0 and out["formationOccupiedSlots"]==[3,5]
    assert out["formation"][0]["troopWikiId"]=="10"
    assert out["formation"][0]["activeSkillName"]=="Hoành Tảo"
    assert out["formation"][0]["activeSkillDescriptionImported"] is False
    n["troops"]=421
    assert npc(n,4,1,"vn")["unitSoldierConsistencyStatus"]=="SOURCE_MISMATCH"
    print("PASS direct map importer original-raw numerical and source-label self tests")

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--index")
    parser.add_argument("--outdir")
    parser.add_argument("--self-test",action="store_true")
    args=parser.parse_args()
    if args.self_test:return self_test()
    if not args.index or not args.outdir:
        parser.error("--index and --outdir required")
    build(args.index,args.outdir)

if __name__=="__main__":main()
