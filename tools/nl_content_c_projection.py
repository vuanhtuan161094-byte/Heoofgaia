"""Project runtime projection from the pinned Mobile source shards. Never edits source."""
from pathlib import Path
import json, hashlib

def read(path):
    return json.loads(path.read_text(encoding="utf-8"))

def valid_units(npc):
    result={}
    for u in npc.get("formation") or []:
        slot=u.get("formationSlot")
        if isinstance(slot,int) and not isinstance(slot,bool) and 0<=slot<9 and slot not in result and len(result)<5:
            result[slot]=u
    return result

def positive(v,default):
    return v if isinstance(v,(int,float)) and not isinstance(v,bool) and v>0 else default

def project_map(m,index):
    raw=sorted(m["npcs"],key=lambda n:(n.get("order") if isinstance(n.get("order"),int) else 99999,str(n["id"])))
    candidates=[(n,valid_units(n)) for n in raw if valid_units(n) and "FORMATION_NOT_EXHAUSTIVE" not in (n.get("blockers") or [])]
    rows=[]
    for n in raw:
        observed=valid_units(n)
        donors=sorted([(d,u) for d,u in candidates if d["id"]!=n["id"]],
                      key=lambda du:(bool(du[0].get("boss"))!=bool(n.get("boss")),abs(positive(du[0].get("level"),1)-positive(n.get("level"),1)),str(du[0]["id"])))
        donor,peer=donors[0] if donors else (None,{})
        incomplete=not observed or "FORMATION_NOT_EXHAUSTIVE" in (n.get("blockers") or [])
        combined=dict(observed)
        if incomplete:
            for slot,u in peer.items():
                if len(combined)>=5: break
                if slot not in combined: combined[slot]=u
        if not combined: combined={4:{}}
        units=[]
        for slot,u in sorted(combined.items()):
            fallback=peer.get(slot) or next(iter(peer.values()),{})
            source=slot in observed
            label=u.get("troopName") or fallback.get("troopName") or "Bộ"
            skill=(u.get("skill") or {}).get("label") or (fallback.get("skill") or {}).get("label") or "Chiến pháp"
            soldiers=positive(u.get("soldiers"),positive(fallback.get("soldiers"),positive(n.get("totalSoldiersRaw"),300)/len(combined)))
            units.append([slot,u.get("name") or n.get("name") or "Quân địch",label,skill,round(soldiers),
                          round(positive(u.get("level"),positive(n.get("level"),1))),
                          "OBSERVED_SLOT" if source else "SIMULATED_SLOT",
                          donor["id"] if donor and (not source or not u.get("soldiers") or not u.get("troopName") or not (u.get("skill") or {}).get("label")) else None])
        rows.append({"id":n["id"],"name":n.get("name") or n["id"],"level":round(positive(n.get("level"),1)),
                     "boss":bool(n.get("boss")),"units":units,
                     "donor":donor["id"] if donor and incomplete else None,
                     "sourceFormationIncomplete":incomplete,
                     "sourceSkillLabels":True,"provenance":"PROJECT_SIMULATED"})
    return {"id":m["id"],"name":m.get("name") or m["id"],"sourceLevel":m.get("mapLevel"),
            "gate":min(28,1+index*28//249),"npcs":rows}

def build(root):
    base=root/"data/ngoalong/modules"
    folder=base/"campaign/source_shards"
    manifest=read(folder/"manifest.json")
    maps=[]; seen=set(); npc_ids=set()
    for filename in sorted(set(p["shard"] for p in manifest["mapLocator"].values())):
        for m in read(folder/filename)["maps"]:
            pointer=manifest["mapLocator"][m["id"]]
            if m["id"] in seen or pointer["npcCount"]!=len(m["npcs"]): raise ValueError("C map mismatch")
            seen.add(m["id"]); maps.append(m)
            for n in m["npcs"]:
                if n["id"] in npc_ids: raise ValueError("C duplicate NPC")
                npc_ids.add(n["id"])
    if len(maps)!=249 or len(npc_ids)!=4903 or seen!=set(manifest["mapLocator"]): raise ValueError("C source coverage drift")
    maps.sort(key=lambda m:m["wikiMapId"])
    projected=[project_map(m,i) for i,m in enumerate(maps)]
    wiki=read(base/"heroes/wiki_catalogue_v1.json")["heroes"]
    alpha=read(root/"data/ngoalong/alpha_content.json")
    old=alpha["heroes"]["projectRoster"]; existing={h["id"] for h in alpha["heroes"]["hero207Roster"]}
    norm=lambda x:x.strip().casefold()
    aliases={}; additions=[]
    if len(wiki)!=364 or len(existing)!=207: raise ValueError("C hero source drift")
    for index,h in enumerate(wiki):
        hid=h["id"]
        if hid in existing: aliases[hid]=hid;continue
        match=[x for x in old if norm(x["name"])==norm(h["name"])]
        same=[x for x in wiki if norm(x["name"])==norm(h["name"])]
        if len(match)==1 and len(same)==1: aliases[hid]=match[0]["id"];continue
        digest=int(hashlib.sha256(hid.encode()).hexdigest()[:8],16)
        kind=["infantry","cavalry","archer","strategist","support"][digest%5]
        pattern,damage,tag=[("single","physical","Phá Trận"),("column","tactic","Xung Phong"),("back","physical","Xuyên Vân"),("row","magic","Hỏa Mưu"),("heal","magic","Hộ Quân")][digest%5]
        role=["Tiền quân","Đột kích","Hậu kích","Mưu sĩ","Hỗ trợ"][digest%5]
        label=tag+" · "+h["name"]
        desc={"pattern":pattern,"kind":damage,"mult":1.45+(digest%20)/100,"tag":label}
        if pattern=="heal": desc.update(healCount=2,bonusMorale=8)
        if kind=="strategist": desc.update(drainMorale=18)
        additions.append({"id":hid,"name":h["name"],"faction":h.get("faction"),"sourceGrade":h.get("indexGrade"),
                          "type":kind,"role":role,"rarity":"Danh tướng","icon":["🛡️","🐎","🏹","🪶","📜"][digest%5],
                          "lead":65+digest%25,"atk":48+digest%40,"def":45+(digest>>4)%40,"int":48+(digest>>8)%40,"agi":45+(digest>>12)%35,
                          "skill":label,"skillDesc":"Chiến pháp thiết kế mô phỏng: "+pattern,"descriptor":desc,
                          "gate":1+index%28,"silver":650+50*(index%28),"provenance":"PROJECT_SIMULATED"})
        aliases[hid]=hid
    if len(aliases)!=364 or len(set(aliases.values()))!=364: raise ValueError("C hero alias collision")
    return {"source":"MOBILE_INDEX_PROJECT_SIMULATED","maps":projected,"heroes":additions,"heroAliases":aliases,
            "counts":{"maps":249,"npcs":4903,"wikiHeroes":364,"newHeroes":len(additions),"runtimeHeroes":14+207+len(additions)}}
