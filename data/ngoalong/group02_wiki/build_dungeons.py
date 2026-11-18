#!/usr/bin/env python3
"""Build original, non-runtime dungeon blueprints from sourced public Wiki facts.

No imaginary heroes/troops/skills, no VNG assets or formula replication.
The source is the CURRENT VNG Mobile wiki, not the 2012 classic webgame.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import zipfile

WIKI = "https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban"


class DungeonBuildError(ValueError):
    pass


def nonempty(value):
    if isinstance(value, str):
        return value.strip() or None
    if isinstance(value, (float, int)) and not isinstance(value, bool):
        return value
    return None


def proven(value, url, derived=False):
    return {
        "classification": "DERIVED" if derived and value is not None else (
            "VERIFIED" if value is not None else "UNKNOWN"
        ),
        "sourceUrl": url if value is not None else None,
    }


def normalize_unit(raw, npc_url):
    wiki_slot = nonempty(raw.get("slot"))
    if wiki_slot is not None:
        if not isinstance(wiki_slot, int) or not (1 <= wiki_slot <= 9):
            raise DungeonBuildError("Wiki formation position outside 1..9")
    soldiers = nonempty(raw.get("soldiers"))
    if soldiers is not None and (not isinstance(soldiers, int) or soldiers < 0):
        raise DungeonBuildError("Invalid soldier count")
    level = nonempty(raw.get("level"))
    skill_name = nonempty(raw.get("skillName"))
    troop_name = nonempty(raw.get("troopName"))
    character_name = nonempty(raw.get("name"))
    return {
        "wikiSlot": wiki_slot,
        "formationSlot": wiki_slot - 1 if wiki_slot is not None else None,
        "name": character_name,
        "level": level,
        "soldiers": soldiers,
        "troopName": troop_name,
        "skillName": skill_name,
        "heroId": None,
        "troopId": None,
        "skillId": None,
        "stats": None,
        "fieldProvenance": {
            "wikiSlot": proven(wiki_slot, npc_url),
            "formationSlot": proven(wiki_slot, npc_url, derived=True),
            "name": proven(character_name, npc_url),
            "level": proven(level, npc_url),
            "soldiers": proven(soldiers, npc_url),
            "troopName": proven(troop_name, npc_url),
            "skillName": proven(skill_name, npc_url),
            "heroId": proven(None, None),
            "troopId": proven(None, None),
            "skillId": proven(None, None),
            "stats": proven(None, None),
        },
    }


def normalize_npc(raw, map_id):
    ai_id = nonempty(raw.get("aiId"))
    if not isinstance(ai_id, int) or ai_id <= 0:
        raise DungeonBuildError("NPC missing a positive Wiki aiId")
    url = nonempty(raw.get("url"))
    if not url or "/ngoa-long-wiki/pho-ban-chi-tiet?" not in url:
        raise DungeonBuildError("NPC has no official detail URL")
    units = [normalize_unit(x, url) for x in (raw.get("unitsObserved") or [])]
    slots = [x["wikiSlot"] for x in units if x["wikiSlot"] is not None]
    if len(slots) != len(set(slots)):
        raise DungeonBuildError(f"NPC {ai_id}: duplicate formation position")
    total = nonempty(raw.get("totalSoldiers"))
    if total is not None and (not isinstance(total, int) or total < 0):
        raise DungeonBuildError("Invalid NPC total soldier count")
    observed = sum(x["soldiers"] for x in units if x["soldiers"] is not None)
    complete_sum = bool(units) and all(x["soldiers"] is not None for x in units)
    matches = bool(complete_sum and total is not None and observed == total)
    wiki_name = nonempty(raw.get("name"))
    kind = nonempty(raw.get("kind"))
    lvl = nonempty(raw.get("level"))
    listed_order = nonempty(raw.get("listOrder"))
    missing = []
    for key, value in (("name", wiki_name), ("kind", kind), ("level", lvl),
                       ("soldiers", total), ("listOrder", listed_order)):
        if value is None:
            missing.append(key)
    if not units:
        missing.append("formationUnits")
    if any(x["troopName"] is None for x in units):
        missing.append("unitTroopNames")
    if any(x["skillName"] is None for x in units):
        missing.append("unitSkillNames")
    if not matches:
        missing.append("unitSoldierSumNotVerified")
    return {
        "id": f"wiki-m{map_id}-ai{ai_id}",
        "wikiAiId": ai_id,
        "mapId": f"wiki-map-{map_id}",
        "order": listed_order,
        "name": wiki_name,
        "kind": kind,
        "level": lvl,
        "totalSoldiers": total,
        "combatCoefficientShown": nonempty(raw.get("attackCoefficientShown")),
        "combatCoefficientFormula": None,
        "formationUnits": units,
        "observedUnitSoldierSum": observed if complete_sum else None,
        "soldierSumMatchesVisibleUnits": matches if complete_sum and total is not None else None,
        "formationComplete": False,
        "integrationStatus": "REFERENCE_ONLY",
        "missing": sorted(set(missing)),
        "sourceUrl": url,
        "fieldProvenance": {
            "name": proven(wiki_name, url),
            "kind": proven(kind, url),
            "order": proven(listed_order, url),
            "level": proven(lvl, url),
            "totalSoldiers": proven(total, url),
            "combatCoefficientShown": proven(nonempty(raw.get("attackCoefficientShown")), url),
            "combatCoefficientFormula": proven(None, None),
            "formationUnits": proven(units if units else None, url),
            "observedUnitSoldierSum": proven(observed if complete_sum else None, url, derived=True),
            "formationComplete": proven(None, None),
        },
    }


def normalize_map(raw):
    wiki_map_id = nonempty(raw.get("mapId"))
    if not isinstance(wiki_map_id, int) or wiki_map_id <= 0:
        raise DungeonBuildError("Map missing valid Wiki mapId")
    map_url = nonempty(raw.get("url"))
    if not map_url or "/ngoa-long-wiki/pho-ban-chi-tiet?" not in map_url:
        raise DungeonBuildError("Map missing official URL")
    raw_npcs = raw.get("npcs") or []
    seen = set()
    npcs = []
    for src in raw_npcs:
        row = normalize_npc(src, wiki_map_id)
        if row["wikiAiId"] in seen:
            raise DungeonBuildError(f"Map {wiki_map_id}: duplicate NPC {row['wikiAiId']}")
        seen.add(row["wikiAiId"])
        npcs.append(row)
    known_order = [r["order"] for r in npcs if r["order"] is not None]
    if len(known_order) != len(set(known_order)):
        raise DungeonBuildError(f"Map {wiki_map_id}: repeated combat-order number")
    if len(known_order) == len(npcs):
        npcs.sort(key=lambda r: r["order"])
    name = nonempty(raw.get("name"))
    city = nonempty(raw.get("cityLevel"))
    map_level = nonempty(raw.get("level"))
    announced = nonempty(raw.get("advertisedNpcCount"))
    actually_complete = bool(announced is not None and len(npcs) == announced
                            and raw.get("npcListComplete") is True)
    return {
        "id": f"wiki-map-{wiki_map_id}",
        "wikiMapId": wiki_map_id,
        "name": name,
        "faction": nonempty(raw.get("faction")),
        "mapLevel": map_level,
        "cityLevelRequired": city,
        "advertisedNpcCount": announced,
        "observedNpcCount": len(npcs),
        "npcListComplete": actually_complete,
        "mapOrder": None,
        "dungeonType": None,
        "victoryReward": None,
        "combatRules": None,
        "integrationStatus": "REFERENCE_ONLY",
        "npcs": npcs,
        "sourceUrl": map_url,
        "fieldProvenance": {
            "name": proven(name, map_url),
            "faction": proven(nonempty(raw.get("faction")), map_url),
            "mapLevel": proven(map_level, map_url),
            "cityLevelRequired": proven(city, map_url),
            "advertisedNpcCount": proven(announced, map_url),
            "observedNpcCount": proven(len(npcs), map_url, derived=True),
            "mapOrder": proven(None, None),
            "dungeonType": proven(None, None),
            "victoryReward": proven(None, None),
            "combatRules": proven(None, None),
        },
    }


def build(records, *, source_label="GitHub Action Wiki extraction"):
    if not isinstance(records, list):
        raise DungeonBuildError("Expected a list of source maps")
    by_id = {}
    for row in records:
        m = normalize_map(row)
        if m["wikiMapId"] in by_id:
            raise DungeonBuildError(f"Duplicate map ID {m['wikiMapId']}")
        by_id[m["wikiMapId"]] = m
    maps = [by_id[k] for k in sorted(by_id)]
    npcs = [npc for m in maps for npc in m["npcs"]]
    complete_maps = sum(m["npcListComplete"] for m in maps)
    source_claim_count = sum(m["advertisedNpcCount"] or 0 for m in maps)
    unknown_names = sum(n["name"] is None for n in npcs)
    missing_units = sum(not n["formationUnits"] for n in npcs)
    soldier_mismatch = sum(n["soldierSumMatchesVisibleUnits"] is False for n in npcs)
    report = {
        "sourceLabel": source_label,
        "sourceWiki": WIKI,
        "sourceVersion": "CURRENT_VNG_MOBILE",
        "classicWebgameParity": "UNKNOWN",
        "mapCount": len(maps),
        "npcDetailCount": len(npcs),
        "advertisedNpcTotalAcrossMaps": source_claim_count,
        "mapNpcRosterCompleteCount": complete_maps,
        "mapNpcRosterIncompleteCount": len(maps) - complete_maps,
        "npcNamesMissing": unknown_names,
        "npcFormationsMissing": missing_units,
        "soldierTotalContradictions": soldier_mismatch,
        "fullyGameplayReadyMaps": 0,
        "status": "PARTIAL" if complete_maps != len(maps) or unknown_names or missing_units else "SOURCE_REVIEW_REQUIRED",
        "warning": "Indexed NPC rows are not gameplay-ready until skills, troop refs, all 3x3 units, version and mechanics are reviewed.",
    }
    out = {
        "schemaVersion": 1,
        "kind": "NGOALONG_WIKI_DUNGEON_BLUEPRINT",
        "sourceEdition": "CURRENT_VNG_MOBILE",
        "classicWebgameParity": "UNKNOWN",
        "runtimeAuthority": False,
        "engineChangesRequired": True,
        "source": WIKI,
        "maps": maps,
    }
    return out, report


def read_map_sources(paths):
    result = []
    for path in paths:
        path = Path(path)
        if path.is_dir():
            files = sorted(path.glob("*.json"))
        else:
            files = [path]
        for one in files:
            if one.suffix == ".zip":
                with zipfile.ZipFile(one) as z:
                    payloads = [json.loads(z.read(n)) for n in z.namelist() if n.endswith(".json")]
            else:
                payloads = [json.loads(one.read_text(encoding="utf-8"))]
            for data in payloads:
                if not isinstance(data, dict) or not isinstance(data.get("maps"), list):
                    raise DungeonBuildError(f"Not a Wiki map source: {one}")
                result.extend(data["maps"])
    return result


def self_test():
    npc = {
        "aiId": 82, "name": "Ba Tài", "kind": "BOSS",
        "level": 6, "totalSoldiers": 420,
        "url": WIKI + "-chi-tiet?map=1&ai=82",
        "unitsObserved": [{"slot": 3, "soldiers": 220, "skillName": "Hoành Tảo"},
                          {"slot": 5, "soldiers": 200, "skillName": "Bộc Viêm"}],
    }
    m = {"mapId": 1, "name": "Khúc Dương", "level": 10, "cityLevel": 20,
         "advertisedNpcCount": 1, "npcListComplete": True,
         "url": WIKI + "-chi-tiet?map=1", "npcs": [npc]}
    out, report = build([m])
    t = out["maps"][0]["npcs"][0]
    assert report["npcDetailCount"] == 1
    assert t["soldierSumMatchesVisibleUnits"] is True
    assert [u["formationSlot"] for u in t["formationUnits"]] == [2, 4]
    assert t["order"] is None and t["formationComplete"] is False
    assert all(x["heroId"] is None and x["skillId"] is None for x in t["formationUnits"])
    try:
        build([m, m])
    except DungeonBuildError:
        pass
    else:
        raise AssertionError("Duplicate map not rejected")
    print("PASS: Dungeon Builder provenance, formation, totals and duplicate protection")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--source", action="append", default=[])
    p.add_argument("--output", type=Path)
    p.add_argument("--report", type=Path)
    p.add_argument("--minimum-maps", type=int, default=1)
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    if args.self_test:
        self_test()
        return
    if not args.source or not args.output or not args.report:
        p.error("--source, --output and --report are required")
    out, report = build(read_map_sources(args.source), source_label="; ".join(args.source))
    if report["mapCount"] < args.minimum_maps:
        raise DungeonBuildError(f"Only {report['mapCount']} maps; need {args.minimum_maps}")
    for path, data in ((args.output, out), (args.report, report)):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
