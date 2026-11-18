"""Portable, source-traceable Wiki unit-facts validator (no runtime import)."""
import json
from pathlib import Path

SOURCE = "https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung"
PATH = Path(__file__).resolve().parents[1] / "data/ngoalong/wiki_troop_facts_v1.json"
FAMILIES = {"infantry","spear","cavalry","archer","strategist"}
KINDS = {"defense_specialty","counterattack_low","attack_specialty","counter_spear","morale_gain","offense_defense_specialty","status_chance","target_rear","combat_specialty","team_morale_gain"}
EVENTS = {"passive","attack","basic_attack","round","attack_wave"}
TARGETS = {"self","enemy","enemy_spear","enemy_back_row","all_allies"}

class WikiFactError(ValueError):
    pass

def require(condition, message):
    if not condition:
        raise WikiFactError(message)

def load():
    return json.loads(PATH.read_text(encoding="utf-8"))

def validate(pack):
    require(pack.get("schemaVersion")==1 and pack.get("edition")=="CURRENT_MOBILE_NOT_CLASSIC","wrong Wiki edition")
    require(pack.get("classicParity")=="UNKNOWN" and pack.get("scope")=="SELECTED_FACTS_NOT_COMPLETE_CATALOG","unverified parity or inflated coverage")
    require(pack.get("sourceUrl")==SOURCE and pack.get("checkedAt")=="2026-11-18","missing exact source/date")
    units=pack.get("units",[])
    require(isinstance(units,list) and units,"missing units")
    seen=set()
    for index,unit in enumerate(units):
        label=f"unit[{index}]"
        identifier=unit.get("id")
        require(isinstance(identifier,str) and identifier.startswith("wiki-mobile-") and identifier not in seen,f"{label}: duplicate/invalid id")
        seen.add(identifier)
        require(isinstance(unit.get("name"),str) and unit["name"],f"{label}: name missing")
        require(unit.get("family") in FAMILIES,f"{label}: invalid family")
        require(isinstance(unit.get("tier"),int) and 1<=unit["tier"]<=8,f"{label}: tier invalid")
        require(unit.get("integration")=="REFERENCE_ONLY",f"{label}: research data is not live game content")
        require(unit.get("source",{}).get("url")==SOURCE and unit["source"].get("checkedAt")==pack["checkedAt"],f"{label}: source mismatch")
        provenance=unit.get("fieldProvenance",{})
        require(all(provenance.get(x)=="VERIFIED" for x in ("name","family","tier")),f"{label}: unverified identity")
        unknown=unit.get("unknown",{})
        require(set(unknown)=={"baseStats","evolutionParent","unlockCondition"} and all(v is None for v in unknown.values()),f"{label}: unknown formula, evolution or cost fabricated")
        require(all(provenance.get(x)=="UNKNOWN" for x in unknown),f"{label}: falsely verified unknown")
        entries=unit.get("facts")
        require(isinstance(entries,list) and entries,f"{label}: no mechanical fact")
        for j,mechanic in enumerate(entries):
            p=f"{label}.facts[{j}]"
            require(mechanic.get("kind") in KINDS and mechanic.get("event") in EVENTS and mechanic.get("target") in TARGETS,f"{p}: invalid normalized mechanic")
            require(mechanic.get("interpretation") in {"VERIFIED","DERIVED_TRIGGER"},f"{p}: missing interpretation flag")
            chance=mechanic.get("chance")
            require(chance is None or (type(chance) in (float,int) and 0<chance<=1),f"{p}: invalid chance")
            value=mechanic.get("value")
            require(value is None or (type(value)==int and value>0),f"{p}: invalid amount")
            duration=mechanic.get("durationTurns")
            require(duration is None or (type(duration)==int and duration>0),f"{p}: invalid duration")
            if mechanic["kind"]=="status_chance":
                require(mechanic.get("statusId") in {"confusion","dazzle"} and chance is not None and duration is not None,f"{p}: status incomplete")
            else:
                require(mechanic.get("statusId") is None and chance is None and duration is None,f"{p}: phantom status fields")
            if mechanic["kind"]=="morale_gain":
                require(value is not None and mechanic["target"]=="self",f"{p}: missing verified self morale amount")
            if mechanic["kind"]=="team_morale_gain":
                require(mechanic["target"]=="all_allies",f"{p}: invalid ally group")
    return {"referenceUnits":len(units),"families":sorted({x["family"] for x in units}),
            "unknownStats":len(units),"unknownEvolutionLinks":len(units),"playableUnitImports":0}

if __name__=="__main__":
    print(json.dumps(validate(load()),ensure_ascii=False,indent=2))
