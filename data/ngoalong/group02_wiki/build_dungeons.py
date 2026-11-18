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
    skill_type = nonempty(raw.get("skillSourceType"))
    skill_version = nonempty(raw.get("skillVersion"))
    skill_namespace = nonempty(raw.get("skillNamespace"))
    skill_level = nonempty(raw.get("skillLevelShown"))
    if skill_name is not None and skill_type != "NPC_UNIT_ACTIVE":
        raise DungeonBuildError("Wiki hero-active skill cannot be silently typed as troop/lord/passive skill")
    troop_wiki_id = nonempty(raw.get("troopWikiId"))
    crit_pct = nonempty(raw.get("criticalPercent"))
    counter_pct = nonempty(raw.get("counterattackPercent"))
    return {
        "wikiSlot": wiki_slot,
        "formationSlot": wiki_slot - 1 if wiki_slot is not None else None,
        "name": character_name,
        "level": level,
        "soldiers": soldiers,
        "troopName": troop_name,
        "troopWikiId": troop_wiki_id,
        "troopLabel": nonempty(raw.get("troopLabel")),
        "criticalPercent": crit_pct,
        "counterattackPercent": counter_pct,
        "skillName": skill_name,
        "skillSourceType": skill_type,
        "skillNamespace": skill_namespace,
        "skillLevelShown": skill_level,
        "skillVersion": skill_version,
        "skillHistoricalOrigin": None,
        "passiveSkillNames": None,
        "lordSkillNames": None,
        "troopSkillNames": None,
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
            "troopWikiId": proven(troop_wiki_id, npc_url),
            "troopLabel": proven(nonempty(raw.get("troopLabel")), npc_url),
            "criticalPercent": proven(crit_pct, npc_url),
            "counterattackPercent": proven(counter_pct, npc_url),
            "skillName": proven(skill_name, npc_url),
            "skillSourceType": proven(skill_type, npc_url),
            "skillNamespace": proven(skill_namespace, npc_url),
            "skillLevelShown": proven(skill_level, npc_url),
            "skillVersion": proven(skill_version, npc_url),
            "skillHistoricalOrigin": proven(None, None),
            "passiveSkillNames": proven(None, None),
            "lordSkillNames": proven(None, None),
            "troopSkillNames": proven(None, None),
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
    discrepancy=total-observed if complete_sum and total is not None else None
    matches = discrepancy == 0 if discrepancy is not None else False
    source_full_team = raw.get("fullTeamVerified") is True
    source_slots = raw.get("formationOccupiedSlots")
    source_count = nonempty(raw.get("formationDeclaredUnitCount"))
    if source_full_team:
        if (not isinstance(source_slots, list) or source_count is None
                or source_count != len(units)
                or sorted(source_slots) != sorted(slots)
                or len(slots) != len(units)):
            raise DungeonBuildError(f"NPC {ai_id}: full-team flag is unsupported by selected slots")
    formation_complete = source_full_team and source_count == len(units)
    wiki_name = nonempty(raw.get("name"))
    kind = nonempty(raw.get("kind"))
    lvl = nonempty(raw.get("level"))
    listed_order = nonempty(raw.get("listOrder"))
    first_mover = nonempty(raw.get("firstMoverObserved"))
    missing = []
    for key, value in (("name", wiki_name), ("kind", kind), ("level", lvl),
                       ("soldiers", total), ("listOrder", listed_order)):
        if value is None:
            missing.append(key)
    if not units:
        missing.append("formationUnits")
    if not formation_complete:
        missing.append("formationNotExhaustivelyObserved")
    if any(x["troopName"] is None for x in units):
        missing.append("unitTroopNames")
    if any(x["skillName"] is None for x in units):
        missing.append("unitSkillNames")
    if discrepancy is None:
        missing.append("unitSoldierSumNotVerified")
    elif discrepancy != 0:
        missing.append("WIKI_SOURCE_SOLDIER_SUM_DISAGREEMENT")
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
        "firstMoverObserved": first_mover,
        "npcLordSkills": None,
        "npcPassiveSkills": None,
        "npcStageSkills": None,
        "npcSoulBeastEffects": None,
        "npcSkillVersion": "CURRENT_WIKI_WITH_UNRESOLVED_HISTORICAL_PATCHES",
        "formationUnits": units,
        "formationDeclaredUnitCount": source_count,
        "formationOccupiedSlots": source_slots,
        "observedUnitSoldierSum": observed if complete_sum else None,
        "soldierSumMatchesVisibleUnits": matches if discrepancy is not None else None,
        "unitSoldierDiscrepancy": discrepancy,
        "unitSoldierConsistencyStatus": "MATCH" if discrepancy==0 else ("SOURCE_MISMATCH" if discrepancy is not None else "UNKNOWN"),
        "formationComplete": formation_complete,
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
            "firstMoverObserved": proven(first_mover, url),
            "npcLordSkills": proven(None, None),
            "npcPassiveSkills": proven(None, None),
            "npcStageSkills": proven(None, None),
            "npcSoulBeastEffects": proven(None, None),
            "npcSkillVersion": proven("CURRENT_WIKI_WITH_UNRESOLVED_HISTORICAL_PATCHES", url, derived=True),
            "formationUnits": proven(units if units else None, url),
            "observedUnitSoldierSum": proven(observed if complete_sum else None, url, derived=True),
            "unitSoldierDiscrepancy": proven(discrepancy, url, derived=True),
            "unitSoldierConsistencyStatus": proven("MATCH" if discrepancy==0 else ("SOURCE_MISMATCH" if discrepancy is not None else None), url, derived=True),
            "formationDeclaredUnitCount": proven(source_count, url),
            "formationOccupiedSlots": proven(source_slots, url),
            "formationComplete": proven(formation_complete, url, derived=True),
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
    stage_rules = raw.get("mapWideRulesObserved") or []
    if not isinstance(stage_rules,list):
        raise DungeonBuildError("Map-wide battle rules must be a separate list")
    if any(not isinstance(v,dict) or v.get("skillSourceType") != "DUNGEON_WIDE_RULE" for v in stage_rules):
        raise DungeonBuildError("Map-wide rule must have its own provenance and type")
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
        "detailDeclaredNpcCount": nonempty(raw.get("detailDeclaredNpcCount")),
        "npcCountIndexVsDetailMismatch": bool(raw.get("npcCountIndexVsDetailMismatch", False)),
        "npcFullyEnumeratedFormationCount": sum(n["formationComplete"] for n in npcs),
        "mapOrder": None,
        "dungeonType": None,
        "victoryReward": None,
        "combatRules": None,
        "mapWideBattleRulesObserved": stage_rules,
        "historicalVersionStatus": "CURRENT_WIKI_SNAPSHOT_PATCH_LEDGER_SEPARATE",
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
            "npcListComplete": proven(actually_complete, map_url, derived=True),
            "detailDeclaredNpcCount": proven(nonempty(raw.get("detailDeclaredNpcCount")), map_url),
            "npcCountIndexVsDetailMismatch": proven(bool(raw.get("npcCountIndexVsDetailMismatch", False)), map_url, derived=True),
            "npcFullyEnumeratedFormationCount": proven(sum(n["formationComplete"] for n in npcs), map_url, derived=True),
            "mapOrder": proven(None, None),
            "dungeonType": proven(None, None),
            "victoryReward": proven(None, None),
            "combatRules": proven(None, None),
            "mapWideBattleRulesObserved": proven(stage_rules if stage_rules else None,map_url),
            "historicalVersionStatus": proven("CURRENT_WIKI_SNAPSHOT_PATCH_LEDGER_SEPARATE",map_url,derived=True),
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
    full_formations = sum(n["formationComplete"] for n in npcs)
    detail_count_conflicts = sum(m["npcCountIndexVsDetailMismatch"] for m in maps)
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
        "fullNpcFormationCount": full_formations,
        "unverifiedNpcFormationCount": len(npcs)-full_formations,
        "detailVsIndexNpcCountConflicts": detail_count_conflicts,
        "fullyGameplayReadyMaps": 0,
        "status": "PARTIAL" if complete_maps != len(maps) or unknown_names or missing_units or full_formations != len(npcs) else "SOURCE_REVIEW_REQUIRED",
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


def make_integration_handoff(out, report):
    """A read-only contract for group00/integration; never modifies runtime."""
    maps = out["maps"]
    return {
        "schemaVersion": 1,
        "group": "02_WIKI_SYSTEMS",
        "target": "NGOALONG_GAMEPLAY_INTEGRATION",
        "sourceEdition": "CURRENT_VNG_MOBILE",
        "classicParity": "UNKNOWN",
        "releaseStatus": "REFERENCE_ONLY_NOT_GAMEPLAY_READY",
        "canonicalBlueprintFile": "data/ngoalong/group02_wiki/wiki_dungeon_blueprints.json",
        "coverage": {
            "mapsIndexed": len(maps),
            "npcDetailRows": report["npcDetailCount"],
            "npcFormationExhaustiveRows": report["fullNpcFormationCount"],
            "npcFormationMissingRows": report["unverifiedNpcFormationCount"],
            "mapRosterIncomplete": report["mapNpcRosterIncompleteCount"],
            "soldierTotalContradictions": report["soldierTotalContradictions"],
        },
        "mapHandoffs": [
            {
                "wikiMapId": m["wikiMapId"],
                "name": m["name"],
                "npcRosterComplete": m["npcListComplete"],
                "npcCount": len(m["npcs"]),
                "formationCompleteNpcCount": m["npcFullyEnumeratedFormationCount"],
                "blockingIssues": sorted(set(
                    (["NPC_ROSTER_INCOMPLETE"] if not m["npcListComplete"] else [])
                    + (["NPC_FORMATIONS_INCOMPLETE"] if m["npcFullyEnumeratedFormationCount"] != len(m["npcs"]) else [])
                    + (["SKILL_TROOP_RUNTIME_BINDINGS_NOT_VERIFIED"])
                    + (["CLASSIC_PARITY_UNKNOWN"])
                )),
            } for m in maps
        ],
        "integrationContract": {
            "requiredBeforeGameplay": [
                "resolve every Wiki troop and skill ID to original project mechanics without claiming Wiki formula parity",
                "confirm 1-based Wiki slot orientation against runtime 0-based 3x3 coordinates",
                "validate entire NPC roster order and reward/settlement authority",
                "reuse canonical Save v5 and replay receipt gates; no double settlement",
                "pass all gameplay quick/full exact-SHA gates before moving integrationStatus to TESTED",
            ],
            "forbidden": [
                "no direct runtime import from partial Wiki snapshots",
                "no invented missing NPC values, troop stats, skill probabilities or equipment",
                "no protected art, code or player battle reports",
            ],
        },
    }


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
        "unitsObserved": [{"slot": 3, "soldiers": 220, "skillName": "Hoành Tảo", "skillSourceType":"NPC_UNIT_ACTIVE"},
                          {"slot": 5, "soldiers": 200, "skillName": "Bộc Viêm", "skillSourceType":"NPC_UNIT_ACTIVE"}],
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
    assert t["unitSoldierDiscrepancy"] == 0
    try:
        build([m, m])
    except DungeonBuildError:
        pass
    else:
        raise AssertionError("Duplicate map not rejected")
    verified = json.loads(json.dumps(m))
    verified["npcs"][0]["fullTeamVerified"] = True
    verified["npcs"][0]["formationOccupiedSlots"] = [3,5]
    verified["npcs"][0]["formationDeclaredUnitCount"] = 2
    a,_ = build([verified])
    assert a["maps"][0]["npcs"][0]["formationComplete"] is True
    broken = json.loads(json.dumps(verified))
    broken["npcs"][0]["formationOccupiedSlots"] = [3,5,7]
    try:
        build([broken])
    except DungeonBuildError:
        pass
    else:
        raise AssertionError("Unsupported full-team claim was accepted")
    conflict=json.loads(json.dumps(verified))
    conflict["npcs"][0]["totalSoldiers"]=421
    conflicted,_=build([conflict])
    n=conflicted["maps"][0]["npcs"][0]
    assert n["unitSoldierDiscrepancy"]==1 and "WIKI_SOURCE_SOLDIER_SUM_DISAGREEMENT" in n["missing"]
    print("PASS: Dungeon Builder provenance, nine-slot coverage, source mismatch preservation and duplicate protection")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--source", action="append", default=[])
    p.add_argument("--output", type=Path)
    p.add_argument("--report", type=Path)
    p.add_argument("--handoff", type=Path)
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
    output_files = [(args.output, out), (args.report, report)]
    if args.handoff:
        output_files.append((args.handoff, make_integration_handoff(out, report)))
    for path, data in output_files:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
