#!/usr/bin/env python3
"""C build-time source and runtime-projection contract (all 21 real shards)."""
from pathlib import Path
import sys, json
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
from nl_content_c_projection import build
from nl_content_c_native import apply_c_native

def main():
    data=build(ROOT)
    maps=data["maps"]; ids=set()
    assert len(maps)==249 and len({m["id"] for m in maps})==249
    assert sum(len(m["npcs"]) for m in maps)==4903
    for m in maps:
        peers={n["id"] for n in m["npcs"]}
        assert 1<=m["gate"]<=28 and peers
        for n in m["npcs"]:
            assert n["id"] not in ids and 1<=len(n["units"])<=5
            ids.add(n["id"]); slots=[u[0] for u in n["units"]]
            assert len(set(slots))==len(slots) and all(0<=i<9 for i in slots)
            assert all(u[1] and u[2] and u[3] and u[4]>0 and u[6] in ("OBSERVED_SLOT","SIMULATED_SLOT") for u in n["units"])
            assert all(u[7] is None or u[7] in peers for u in n["units"])
            assert n["donor"] is None or n["donor"] in peers
            assert n["provenance"]=="PROJECT_SIMULATED"
    assert len(ids)==4903
    assert len(data["heroAliases"])==len(set(data["heroAliases"].values()))==364
    assert data["counts"]["newHeroes"]==147 and data["counts"]["runtimeHeroes"]==368
    assert all(h["descriptor"]["tag"] and h["descriptor"]["pattern"] and h["descriptor"]["mult"]>0 for h in data["heroes"])
    assert len(data["awakeningSkills"])==44
    tier4=json.loads((ROOT/"data/ngoalong/modules/troops/classic_web_tier4_v1.json").read_text(encoding="utf-8"))["troops"]
    assert len(tier4)==len({t["id"] for t in tier4})==40
    for family in ("infantry","spear","cavalry","archer","strategist"):
        assert len([t for t in tier4 if t["family"]==family])==8
    src=(ROOT/"index.html").read_text(encoding="utf-8")
    patched=apply_c_native(src)
    assert apply_c_native(patched)==patched
    assert patched.count("rewards=nlContentCSettle(battle.nlContentC)")==1
    print("C_SOURCE_CONTRACT PASS",data["counts"],"tier4",len(tier4))
if __name__=="__main__":
    main()
