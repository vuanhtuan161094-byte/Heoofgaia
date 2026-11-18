#!/usr/bin/env python3
"""Match dated publisher dungeon patches against current Wiki snapshots; never auto-patch."""
from __future__ import annotations
import argparse,json,re,unicodedata
from collections import defaultdict
from pathlib import Path

def norm(v):
    if not v:return None
    s=unicodedata.normalize("NFC",str(v)).lower()
    return re.sub(r"\s+"," ",re.sub(r"[\s–—-]+"," ",s)).strip()

def review(blueprints,history):
    maps=blueprints.get("maps",[])
    pool=defaultdict(list)
    for m in maps:
        pool[norm(m["name"])].append(m)
    outcomes=[]
    for evt in history["events"]:
        item=dict(eventId=evt["id"],releaseId=evt["releaseId"],operation=evt["operation"],
            component=evt["component"],sourceUrl=evt["sourceUrl"],
            mapName=evt["mapName"],npcName=evt["npcName"],slot1Based=evt["slot1Based"],
            wikiMapId=None,wikiAiId=None,matchedSkillOrTroop=None,
            status="NOT_REVIEWABLE",reason="SOURCE_SCOPE_UNRESOLVED")
        candidates=pool.get(norm(evt["mapName"]),[]) if evt["mapName"] else []
        if evt["mapName"] is None:
            item["reason"]="GLOBAL_OR_UNSCOPED_RELEASE_NOTE"
        elif len(candidates)==0:
            item["reason"]="CURRENT_WIKI_MAP_NAME_NOT_FOUND_EXACTLY"
        elif len(candidates)>1:
            item["status"]="AMBIGUOUS"
            item["reason"]="DUPLICATE_MAP_TITLE_DIFFERENT_ID"
        else:
            m=candidates[0]
            item["wikiMapId"]=m["wikiMapId"]
            item["status"]="MAP_MATCHED"
            item["reason"]="MAP_NAME_EXACT_UNIQUE"
            if evt["operation"]=="MAP_RELEASED":
                item["status"]="RELEASE_DATE_MATCHED"
                item["reason"]="PUB_PATCH_LISTS_THIS_MAP"
            elif not evt["npcName"]:
                item["status"]="HISTORICAL_REVIEW_REQUIRED"
                item["reason"]="NO_NPC_QUALIFIER"
            else:
                matches=[n for n in m["npcs"] if norm(n.get("name"))==norm(evt["npcName"])]
                if not matches:
                    item["status"]="NPC_NOT_SEEN"
                    item["reason"]="NO_IDENTICAL_NPC_IN_CURRENT_IMPORTED_ROSTER"
                elif len(matches)>1:
                    item["status"]="AMBIGUOUS"
                    item["reason"]="NPC_NAME_REPEATED_IN_MAP"
                else:
                    npc=matches[0]
                    item["wikiAiId"]=npc["wikiAiId"]
                    item["status"]="NPC_MATCHED_REVIEW_REQUIRED"
                    item["reason"]="HISTORICAL_CHANGE_DOES_NOT_IMPLY_SAME_CURRENT_MECHANIC"
                    slot=evt.get("slot1Based")
                    if slot is not None and evt["component"] in ("NPC_FORMATION_SLOT","NPC_UNIT_ACTIVE"):
                        units=[u for u in npc["formationUnits"] if u.get("wikiSlot")==slot]
                        if len(units)==1:
                            u=units[0]
                            if npc.get("formationComplete") is True:
                                current=(
                                    u.get("skillName") if evt["component"]=="NPC_UNIT_ACTIVE" else
                                    u.get("name") or u.get("troopName")
                                )
                                item["matchedSkillOrTroop"]=current
                                if current is None:
                                    item["reason"]="UNIT_NAME_NOT_EXTRACTED"
                                elif evt.get("currentFromPatch") and norm(current)==norm(evt["currentFromPatch"]):
                                    item["status"]="CURRENT_MATCHES_PUBLISHED_PATCH"
                                    item["reason"]="NON_RUNTIME_VERSION_CHECK_ONLY"
                                else:
                                    item["status"]="LIVE_DIFFERS_FROM_OLD_PATCH"
                                    item["reason"]="MAY_HAVE_CHANGED_AGAIN; CHECK_NEWER_NOTICES"
                            else:
                                item["reason"]="UNIT_3X3_NOT_EXHAUSTIVELY_READ"
                        else:
                            item["reason"]="FORMATIONS_SLOT_NOT_COLLECTED"
        outcomes.append(item)
    counts={}
    for x in outcomes:counts[x["status"]]=counts.get(x["status"],0)+1
    return {
        "schemaVersion":1,
        "kind":"HISTORICAL_DUNGEON_PATCH_CROSSCHECK",
        "sourceEdition":"VNG_MOBILE","classicWebgameParity":"UNKNOWN",
        "runtimeAuthority":False,
        "snapshotStatus":"VERSION_DIFF_UNDER_REVIEW",
        "sourceHistory":"data/ngoalong/group02_wiki/dungeon_patch_history.json",
        "count":len(outcomes),"statuses":counts,
        "rule":"Only exact unique map and NPC title matches; no edits to the scraped Wiki blueprint or runtime",
        "items":outcomes
    }

def selftest():
    src={"maps":[{"wikiMapId":34,"name":"Phàn Thành Chiến","npcs":[{
        "wikiAiId":5,"name":"Giả Hử","formationComplete":True,
        "formationUnits":[{"wikiSlot":5,"name":"Long Xung Kiêu","troopName":None,"skillName":"Đạp Phá"}]}]}]}
    hist={"events":[{"id":"x","releaseId":"REL-1","operation":"TROOP_CHANGED",
        "component":"NPC_FORMATION_SLOT","sourceUrl":"https://ngoalong.vnggames.com",
        "mapName":"Phàn Thành Chiến","npcName":"Giả Hử","slot1Based":5,
        "currentFromPatch":"Long Xung Kiêu"}]}
    out=review(src,hist)
    assert out["statuses"].get("CURRENT_MATCHES_PUBLISHED_PATCH")==1
    src["maps"].append(json.loads(json.dumps(src["maps"][0])))
    assert review(src,hist)["statuses"].get("AMBIGUOUS")==1
    print("PASS: verified version comparator; duplicate titles remain ambiguous")

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--blueprints",type=Path)
    p.add_argument("--history",type=Path)
    p.add_argument("--output",type=Path)
    p.add_argument("--self-test",action="store_true")
    a=p.parse_args()
    if a.self_test:return selftest()
    if not a.blueprints or not a.history or not a.output:
        p.error("--blueprints --history --output required")
    bp=json.loads(a.blueprints.read_text(encoding="utf-8"))
    ledger=json.loads(a.history.read_text(encoding="utf-8"))
    out=review(bp,ledger)
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"audit":out["statuses"],"events":out["count"]},ensure_ascii=False))

if __name__=="__main__":main()
