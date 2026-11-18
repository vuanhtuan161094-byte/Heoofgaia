"""Focused validation of public factual troop data, not a gameplay-pass claim."""
import copy
import json
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
from ngoalong_wiki_facts import WikiFactError,load,validate  # noqa: E402

def reject(pack):
    try:
        validate(pack)
    except WikiFactError:
        return True
    return False

def run():
    source=load()
    summary=validate(source)
    units={u["name"]:u for u in source["units"]}
    checks=[]
    def check(name,ok):
        checks.append((name,bool(ok)))
        print(("PASS " if ok else "FAIL ")+name,flush=True)
    def mechanic(name,kind):
        return next(x for x in units[name]["facts"] if x["kind"]==kind)
    check("nine distinct reviewed troops across all five core families",
          summary["referenceUnits"]==9 and len(summary["families"])==5)
    check("Bàn Hộ Vệ: infantry tier 4, +50 morale when attacking",
          units["Bàn Hộ Vệ"]["tier"]==4 and mechanic("Bàn Hộ Vệ","morale_gain")["value"]==50)
    check("Cang Chùy: tier 4, 10% confusion for one turn; event interpretation marked",
          mechanic("Cang Chùy","status_chance")["chance"]==0.1
          and mechanic("Cang Chùy","status_chance")["durationTurns"]==1
          and mechanic("Cang Chùy","status_chance")["interpretation"]=="DERIVED_TRIGGER")
    check("Ảnh Vệ: rear attack with 15% one-turn dazzle",
          units["Ảnh Vệ"]["tier"]==4 and mechanic("Ảnh Vệ","status_chance")["chance"]==0.15
          and mechanic("Ảnh Vệ","target_rear")["target"]=="enemy_back_row")
    check("Lôi Cổ / Cổ Hiệu Quân: source does not specify team morale magnitude",
          mechanic("Lôi Cổ","team_morale_gain")["value"] is None
          and mechanic("Cổ Hiệu Quân","team_morale_gain")["value"] is None)
    check("catalog does not misrepresent reference records as playable troops",
          all(u["integration"]=="REFERENCE_ONLY" for u in units.values()))
    invalid=copy.deepcopy(source);invalid["units"][0]["unknown"]["baseStats"]={"def":200}
    check("validator rejects invented numeric unit stats",reject(invalid))
    invalid=copy.deepcopy(source);invalid["units"][3]["facts"][1]["chance"]=2
    check("validator rejects chance above one",reject(invalid))
    invalid=copy.deepcopy(source);invalid["units"][2]["unknown"]["evolutionParent"]="unknown"
    check("validator rejects undocumented evolution graph",reject(invalid))
    invalid=copy.deepcopy(source);invalid["units"][2]["integration"]="PLAYABLE"
    check("validator rejects false runtime integration status",reject(invalid))
    result={"passed":sum(ok for _,ok in checks),"total":len(checks),
            "failed":[name for name,ok in checks if not ok],"catalog":summary}
    (ROOT/"qa/nl_wiki_troop_facts_summary.json").write_text(
        json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(result,ensure_ascii=False),flush=True)
    return 1 if result["failed"] else 0

if __name__=="__main__":
    raise SystemExit(run())
